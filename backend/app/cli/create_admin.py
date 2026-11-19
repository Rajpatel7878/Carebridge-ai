"""Secure CLI utility to provision the initial CareBridge AI administrator account.

Usage (environment variables — recommended for automation/containers):
    cd backend
    ADMIN_FULL_NAME="Platform Administrator" \
    ADMIN_EMAIL="admin@example.org" \
    ADMIN_PASSWORD="<strong-password>" \
    .venv/bin/python -m app.cli.create_admin

Usage (interactive secure prompt):
    cd backend
    .venv/bin/python -m app.cli.create_admin
"""

import argparse
import getpass
import os
import sys

from sqlalchemy import inspect

from app.core.exceptions import AppException
from app.database.session import SessionLocal, engine
from app.services.auth_service import provision_admin_account


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m app.cli.create_admin",
        description="Safely provision a CareBridge AI administrator account.",
    )
    parser.add_argument(
        "--allow-additional",
        action="store_true",
        help="Allow provisioning an additional ADMIN when one already exists.",
    )
    return parser.parse_args(argv)


def _read_credentials() -> tuple[str, str, str]:
    """Read administrator details from environment variables or interactive prompts.

    Never echoes or logs passwords.
    """
    env_name = os.environ.get("ADMIN_FULL_NAME", "").strip()
    env_email = os.environ.get("ADMIN_EMAIL", "").strip()
    env_password = os.environ.get("ADMIN_PASSWORD", "")

    if env_email and env_password:
        return env_name or "CareBridge Administrator", env_email, env_password

    if not sys.stdin.isatty():
        raise ValueError(
            "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required when "
            "running non-interactively."
        )

    full_name = env_name or input("Administrator full name [CareBridge Administrator]: ").strip()
    if not full_name:
        full_name = "CareBridge Administrator"

    email = env_email or input("Administrator email: ").strip()
    password = env_password or getpass.getpass("Administrator password (hidden): ")
    confirm = getpass.getpass("Confirm administrator password (hidden): ")
    if password != confirm:
        raise ValueError("Passwords do not match.")

    return full_name, email, password


def main(argv: list[str] | None = None) -> int:
    """Execute admin provisioning and return a POSIX exit code."""
    args = _parse_args(argv)

    inspector = inspect(engine)
    if not inspector.has_table("users"):
        sys.stderr.write(
            "Error: Database schema is not initialized. Run 'alembic upgrade head' first.\n"
        )
        return 1

    try:
        full_name, email, password = _read_credentials()
    except (ValueError, EOFError, KeyboardInterrupt) as exc:
        sys.stderr.write(f"Error: {exc}\n")
        return 1

    with SessionLocal() as db:
        try:
            admin = provision_admin_account(
                db,
                full_name=full_name,
                email=email,
                password=password,
                allow_additional=args.allow_additional,
            )
        except (AppException, ValueError) as exc:
            message = exc.message if isinstance(exc, AppException) else str(exc)
            sys.stderr.write(f"Error: {message}\n")
            return 1

    # Explicitly delete plaintext reference and print only non-sensitive metadata.
    del password
    sys.stdout.write(
        f"Administrator provisioned successfully: id={admin.id} "
        f"email={admin.email} role={admin.role}\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
