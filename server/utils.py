import uuid

def get_uuid4() -> str:
    return str(uuid.uuid4())

def is_valid_uuid4(uuid_str: str) -> bool:
    try:
        val = uuid.UUID(uuid_str, version=4)
    except ValueError:
        return False
    
    return str(val) == uuid_str