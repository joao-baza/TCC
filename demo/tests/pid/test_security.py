from pid.security import generate_secret, hash_secret, secret_matches


def test_generated_secrets_are_unique_and_url_safe() -> None:
    first = generate_secret()
    second = generate_secret()
    assert first != second
    assert len(first) >= 43
    assert all(character.isalnum() or character in "-_" for character in first)


def test_hash_uses_pepper_and_never_contains_plain_secret() -> None:
    secret = "view-token"
    first = hash_secret(secret, "a" * 32)
    second = hash_secret(secret, "b" * 32)
    assert first != second
    assert secret not in first
    assert secret_matches(secret, "a" * 32, first)
    assert not secret_matches("wrong-token", "a" * 32, first)


def test_hash_matches_stable_sha256_hmac_vector() -> None:
    assert hash_secret(
        "The quick brown fox jumps over the lazy dog",
        "key",
    ) == "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"
