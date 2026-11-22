<?php
// OBSOLETO: referencia historica. El checkout real esta en functions/api/checkout.js (Cloudflare Pages Functions).
declare(strict_types=1);

/**
 * REFERENCE ONLY — do not deploy as the production checkout.
 *
 * This file demonstrates the server-side validation expected by the XHOCK
 * frontend. It does NOT create a Stripe Checkout Session, charge a card, write
 * an order or call Zapier/CRM. The real KOA endpoint must keep that logic and
 * return { "url": "https://checkout.stripe.com/..." } after validating.
 *
 * Contract: POST /tickets/api/checkout.php
 * - 200: validation passed (reference response; real endpoint returns Stripe URL)
 * - 400: malformed JSON
 * - 405: method not allowed
 * - 413: body too large
 * - 422: validation errors
 *
 * Test only in staging with Stripe test keys. Never POST valid dummy data to
 * production: it could create a real session or lead.
 */

const MAX_BODY_BYTES = 65536;
const QTY_MIN = 1;
const QTY_MAX = 10;
const AGE_MIN = 5;
const AGE_MAX = 99;
const IDEMPOTENCY_TTL = 600;

const ALLOWED_POSITIONS = [
    'Goalie',
    'Left Wing',
    'Right Wing',
    'Left Defense',
    'Right Defense',
    'Center',
];

const ALLOWED_JERSEY_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/**
 * Send a JSON response and stop.
 *
 * @param array<string, mixed> $payload
 * @param array<string, string> $headers
 */
function respond(int $status, array $payload, array $headers = []): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    foreach ($headers as $name => $value) {
        header($name . ': ' . $value);
    }
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Read the request body as an associative array.
 *
 * Supports application/json and the form encodings that PHP already parses
 * into $_POST (the current frontend sends FormData).
 *
 * @return array<string, mixed>
 */
function read_input(): array
{
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));

    if ($contentType === 'application/json') {
        $raw = file_get_contents('php://input');
        if ($raw === false) {
            respond(400, ['error' => 'Unable to read the request body.']);
        }
        if (strlen($raw) > MAX_BODY_BYTES) {
            respond(413, ['error' => 'Request body is too large.']);
        }
        if (trim($raw) === '') {
            respond(422, ['errors' => ['body' => 'The request body is required.']]);
        }
        try {
            $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            respond(400, ['error' => 'Malformed JSON body.']);
        }
        if (!is_array($decoded)) {
            respond(400, ['error' => 'The JSON body must be an object.']);
        }
        return $decoded;
    }

    if (strlen((string) file_get_contents('php://input')) > MAX_BODY_BYTES) {
        respond(413, ['error' => 'Request body is too large.']);
    }

    return $_POST;
}

/**
 * Trim and remove control characters from a scalar value.
 */
function clean_text(mixed $value): string
{
    if (!is_scalar($value)) {
        return '';
    }
    $text = trim((string) $value);
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    return $text;
}

/**
 * Names: Unicode letters, spaces, apostrophes and hyphens.
 */
function is_valid_name(string $value, int $maxLength): bool
{
    if ($value === '' || mb_strlen($value, 'UTF-8') > $maxLength) {
        return false;
    }
    return (bool) preg_match("/^[\p{L}][\p{L} '’-]*$/u", $value);
}

function is_valid_email(string $value): bool
{
    return $value !== ''
        && strlen($value) <= 254
        && filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Phone: optional leading +, then 7–15 digits after removing spaces,
 * parentheses, dots and hyphens. Replace this with libphonenumber in KOA.
 */
function is_valid_phone(string $value): bool
{
    $digits = preg_replace('/\D+/', '', $value) ?? '';
    return (bool) preg_match('/^\+?[0-9() .-]{7,24}$/', $value)
        && strlen($digits) >= 7
        && strlen($digits) <= 15;
}

function is_valid_country(string $value): bool
{
    return (bool) preg_match('/^[A-Z]{2}$/', $value);
}

function is_true(mixed $value): bool
{
    return $value === true
        || $value === 1
        || $value === '1'
        || (is_string($value) && in_array(strtolower(trim($value)), ['true', 'on', 'yes'], true));
}

/**
 * Basic idempotency for the reference. Production must use a database or
 * Redis with an atomic insert, not a temp file.
 *
 * @param array<string, mixed> $payload
 */
function remember_idempotent_response(string $key, array $payload): void
{
    if ($key === '') {
        return;
    }
    $path = sys_get_temp_dir() . '/koa-checkout-idem-' . hash('sha256', $key) . '.json';
    $record = ['created' => time(), 'payload' => $payload];
    @file_put_contents($path, json_encode($record), LOCK_EX);
}

/**
 * @return array<string, mixed>|null
 */
function recall_idempotent_response(string $key): ?array
{
    if ($key === '') {
        return null;
    }
    $path = sys_get_temp_dir() . '/koa-checkout-idem-' . hash('sha256', $key) . '.json';
    if (!is_file($path)) {
        return null;
    }
    $raw = @file_get_contents($path);
    if ($raw === false) {
        return null;
    }
    $record = json_decode($raw, true);
    if (!is_array($record) || !isset($record['created'], $record['payload'])) {
        return null;
    }
    if ((int) $record['created'] < time() - IDEMPOTENCY_TTL) {
        @unlink($path);
        return null;
    }
    return is_array($record['payload']) ? $record['payload'] : null;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['error' => 'Method not allowed. Use POST.'], ['Allow' => 'POST']);
}

$data = read_input();

// Honeypot: a real user never fills this hidden field. Return a generic 200 so
// bots do not learn that they were detected, but do not process anything.
if (clean_text($data['company'] ?? '') !== '') {
    respond(200, ['ok' => true]);
}

$idempotencyKey = clean_text($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '');
if ($idempotencyKey !== '' && !preg_match('/^[A-Za-z0-9._-]{8,128}$/', $idempotencyKey)) {
    respond(422, ['errors' => ['idempotencyKey' => 'Invalid Idempotency-Key header.']]);
}
$cached = recall_idempotent_response($idempotencyKey);
if ($cached !== null) {
    respond(200, $cached);
}

$errors = [];

$firstName = clean_text($data['firstName'] ?? '');
$lastName = clean_text($data['lastName'] ?? '');
$email = strtolower(clean_text($data['email'] ?? ''));
$phone = clean_text($data['phone'] ?? '');
$country = strtoupper(clean_text($data['country'] ?? ''));
$quantityRaw = $data['quantity'] ?? null;
$players = $data['players'] ?? null;

if (!is_valid_name($firstName, 50)) {
    $errors['firstName'] = 'Enter a valid first name (letters, spaces, apostrophes and hyphens).';
}
if (!is_valid_name($lastName, 50)) {
    $errors['lastName'] = 'Enter a valid last name (letters, spaces, apostrophes and hyphens).';
}
if (!is_valid_email($email)) {
    $errors['email'] = 'Enter a valid email address.';
}
if (!is_valid_phone($phone)) {
    $errors['phone'] = 'Enter a valid phone number (7 to 15 digits).';
}
if (!is_valid_country($country)) {
    $errors['country'] = 'Use a two-letter ISO country code.';
}
if (!is_true($data['terms'] ?? false)) {
    $errors['terms'] = 'You must accept the terms and privacy policy.';
}

$quantity = filter_var($quantityRaw, FILTER_VALIDATE_INT);
if ($quantity === false || $quantity < QTY_MIN || $quantity > QTY_MAX) {
    $errors['quantity'] = 'Quantity must be an integer between ' . QTY_MIN . ' and ' . QTY_MAX . '.';
    $quantity = 0;
}

if (!is_array($players)) {
    $errors['players'] = 'Players must be an array.';
} elseif ($quantity > 0 && count($players) !== $quantity) {
    $errors['players'] = 'The number of players must match the quantity.';
}

if (is_array($players) && $quantity > 0) {
    foreach ($players as $index => $player) {
        $number = (int) $index + 1;
        if (!is_array($player)) {
            $errors['players[' . $index . ']'] = 'Player ' . $number . ' is invalid.';
            continue;
        }

        $name = clean_text($player['name'] ?? '');
        $ageRaw = $player['age'] ?? null;
        $position = clean_text($player['position'] ?? '');
        $jersey = strtoupper(clean_text($player['jerseySize'] ?? ''));

        if (!is_valid_name($name, 60)) {
            $errors['players[' . $index . '].name'] = 'Player ' . $number . ': enter a valid name.';
        }

        $age = filter_var($ageRaw, FILTER_VALIDATE_INT);
        if ($age === false || $age < AGE_MIN || $age > AGE_MAX) {
            $errors['players[' . $index . '].age'] = 'Player ' . $number . ': age must be between ' . AGE_MIN . ' and ' . AGE_MAX . '.';
        }

        if (!in_array($position, ALLOWED_POSITIONS, true)) {
            $errors['players[' . $index . '].position'] = 'Player ' . $number . ': select a valid position.';
        }

        if (!in_array($jersey, ALLOWED_JERSEY_SIZES, true)) {
            $errors['players[' . $index . '].jerseySize'] = 'Player ' . $number . ': select a valid jersey size.';
        }
    }
}

if ($errors !== []) {
    respond(422, ['errors' => $errors]);
}

// ---------------------------------------------------------------------------
// Validation passed.
//
// In the real endpoint, this is where KOA must:
//   1. Calculate the price on the server (never trust a client amount).
//   2. Create the Stripe Checkout Session with server-side line items.
//   3. Persist the order as pending before redirecting.
//   4. Return { "url": "https://checkout.stripe.com/..." }.
//   5. Confirm payment only through a signature-verified Stripe webhook.
//
// This reference deliberately returns no payment URL and creates no order.
// ---------------------------------------------------------------------------

$response = [
    'ok' => true,
    'reference' => true,
    'message' => 'Validation passed. This example does not create a Stripe session or an order.',
    'quantity' => $quantity,
];

remember_idempotent_response($idempotencyKey, $response);

respond(200, $response);
