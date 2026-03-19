from marshmallow import Schema, fields, validate, ValidationError
from flask import jsonify


# Schemas for form validation on the server side.

"""
Creates registration and login schemas using the marshmallow library for validation.
Straightforward - fields.(type) required=True, error_messages={"required": "Error message"}
"""
class RegisterSchema(Schema):
    email = fields.Email(required=True, error_messages={"required": "Email is required", "invalid": "Invalid email format"})
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8, error="Password must be at least 8 characters long"),
        error_messages={"required": "Password is required"}
    )
    first_name = fields.Str(required=True, error_messages={"required": "First name is required"})
    last_name = fields.Str(required=True, error_messages={"required": "Last name is required"})


class LoginSchema(Schema):
    email = fields.Email(required=True, error_messages={"required": "Email is required", "invalid": "Invalid email format"})
    password = fields.Str(required=True, error_messages={"required": "Password is required"})
    

class CreateAppSchema(Schema):
    name = fields.Str(required=True, error_messages={"required": "Name is required"})
    link = fields.Str(required=False, error_messages={"required": "Link is required"})

class CreatePermissionSchema(Schema):
    name = fields.Str(required=True, error_messages={"required": "Name is required"})
    description = fields.Str(required=False, error_messages={"required": "Description is required"})

class GrantPermissionSchema(Schema):
    user_id = fields.Int(required=True, error_messages={"required": "User ID is required"})
    permission_id = fields.Int(required=True, error_messages={"required": "Permission ID is required"})


class RevokePermissionSchema(Schema):
    user_id = fields.Int(required=True, error_messages={"required": "User ID is required"})
    permission_id = fields.Int(required=True, error_messages={"required": "Permission ID is required"})

"""
Initialize schemas for validation functions
Adding the validation functions here to abstract the logic from routes
"""

register_schema = RegisterSchema()
login_schema = LoginSchema()

create_app_schema = CreateAppSchema()
create_permission_schema = CreatePermissionSchema()
grant_permission_schema = GrantPermissionSchema()
revoke_permission_schema = RevokePermissionSchema()


def validate_create_app(data):
    try:
        validated_data = create_app_schema.load(data)
        return validated_data, None
    except ValidationError as err:
        error_response = jsonify({"msg": "Validation error", "errors": err.messages}), 400
        return None, error_response

def validate_create_permission(data):
    try:
        validated_data = create_permission_schema.load(data)
        return validated_data, None
    except ValidationError as err:
        error_response = jsonify({"msg": "Validation error", "errors": err.messages}), 400
        return None, error_response

def validate_grant_permission(data):
    try:
        validated_data = grant_permission_schema.load(data)
        return validated_data, None
    except ValidationError as err:
        error_response = jsonify({"msg": "Validation error", "errors": err.messages}), 400
        return None, error_response


def validate_revoke_permission(data):
    try:
        validated_data = revoke_permission_schema.load(data)
        return validated_data, None
    except ValidationError as err:
        error_response = jsonify({"msg": "Validation error", "errors": err.messages}), 400
        return None, error_response

def validate_register(data):
    """
    Validates registration data.
    Returns: (validated_data, error_response)
    - validated_data: dict with validated email and password if validation passes, None otherwise
    - error_response: Flask response with error if validation fails, None otherwise
    """
    try:
        validated_data = register_schema.load(data)
        return validated_data, None
    except ValidationError as err:
        error_response = jsonify({"msg": "Validation error", "errors": err.messages}), 400
        return None, error_response


def validate_login(data):
    """
    Validates login data.
    Returns: (validated_data, error_response)
    - validated_data: dict with validated email and password if validation passes, None otherwise
    - error_response: Flask response with error if validation fails, None otherwise
    """
    try:
        validated_data = login_schema.load(data)
        return validated_data, None
    except ValidationError as err:
        error_response = jsonify({"msg": "Validation error", "errors": err.messages}), 400
        return None, error_response
