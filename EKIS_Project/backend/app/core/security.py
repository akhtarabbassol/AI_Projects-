from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

# Pre-computed bcrypt hash of the sentinel value "__dummy_timing_prevention__".
# Used in verify_password_safe() to make timing identical whether or not a user
# exists — prevents user-enumeration attacks via response-time differences.
# Computed once offline; no CPU cost at import/startup time.
_DUMMY_HASH: str = "$argon2id$v=19$m=65536,t=3,p=4$OST5j0YH40LplDr5AGTR4w$hcShq5W2lbwoNHqQdRFpIbL7yo6+fdGMmcAoiR0kaPg"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    password: str,
    hashed_password: str,
) -> bool:
    return password_hash.verify(
        password,
        hashed_password,
    )


def verify_password_safe(
    password: str,
    hashed_password: str | None,
) -> bool:
    """Timing-safe password verification.

    Always performs a bcrypt comparison — using a dummy hash when
    ``hashed_password`` is *None* (i.e. user not found) — so the
    endpoint response time is indistinguishable between 'user not found'
    and 'wrong password', preventing user-enumeration attacks.
    """
    if hashed_password is None:
        # Consume the same amount of time as a real verify
        password_hash.verify(password, _DUMMY_HASH)
        return False
    return password_hash.verify(password, hashed_password)
