from typing import Protocol, runtime_checkable


@runtime_checkable
class EmailServiceProtocol(Protocol):
    def send_reset_email(self, email: str, token: str, user_id: str) -> bool: ...
    def send_cart_reminder(self, email: str, cart_id: str, cart_value: float) -> bool: ...


@runtime_checkable
class IdentityServiceProtocol(Protocol):
    def user_exists(self, user_id: str) -> bool: ...
    def is_account_locked(self, user_id: str) -> bool: ...
    def get_email(self, user_id: str) -> str | None: ...


@runtime_checkable
class TokenServiceProtocol(Protocol):
    def generate_reset_token(self, user_id: str) -> str: ...


@runtime_checkable
class CartServiceProtocol(Protocol):
    def is_purchased(self, cart_id: str) -> bool: ...
    def get_customer_email(self, customer_id: str) -> str | None: ...


@runtime_checkable
class ConsentServiceProtocol(Protocol):
    def has_marketing_consent(self, customer_id: str) -> bool: ...


@runtime_checkable
class CrmServiceProtocol(Protocol):
    def update_campaign_state(self, customer_id: str, cart_id: str, state: str) -> None: ...


@runtime_checkable
class AuditServiceProtocol(Protocol):
    def record(self, event_id: str, agent: str, outcome: str, detail: str = "") -> None: ...
