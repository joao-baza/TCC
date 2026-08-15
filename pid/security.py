import hashlib
import hmac
import secrets


def generate_secret() -> str:
    return secrets.token_urlsafe(32)


def hash_secret(secret: str, pepper: str) -> str:
    return hmac.new(
        pepper.encode("utf-8"),
        secret.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def secret_matches(secret: str, pepper: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_secret(secret, pepper), expected_hash)
