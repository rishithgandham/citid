from flask import Blueprint, request, jsonify, make_response
from models import db, Users, RefreshToken
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, set_access_cookies, create_refresh_token, set_refresh_cookies, get_jwt, unset_jwt_cookies, decode_token
from schemas import validate_register, validate_login
from flask import current_app

# Flask Blueprint, a way to organize routes into separate files, 
# this one is for auth routes login and register
auth_bp = Blueprint("auth", __name__)


"""
In the blueprint, the decorator includes the blueprint name and the route path
The register function gets the email and password from the request body and 
creates a new user using the User model. It then creates a JWT token and returns it.
"""
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    
    # Validate input
    validated_data, error_response = validate_register(data)
    if error_response:
        return error_response
    
    email = validated_data["email"]
    password = validated_data["password"]
    
    # Check if user already exists, and create new user if not
    if Users.query.filter_by(email=email).first():
        return jsonify({"msg": "User with this email already exists"}), 400
    user = Users(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit() 
    
    # Create JWT tokens and set them as HTTP cookies (auto-login after registration)
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    # Store refresh token in database
    # Decode the refresh token to get its JTI
    decoded_token = decode_token(refresh_token)
    jti = decoded_token["jti"]
    db.session.add(RefreshToken(jti=jti, user_id=user.id))
    db.session.commit()
    
    # Return response with access and refresh tokens
    response = make_response(jsonify({"msg": "User created successfully"}), 201)
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    return response




"""
The login function gets the email and password from the request body and checks if the user exists 
and the password is correct If the user exists and the password is correct, it creates a JWT token and returns it.
"""
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    
    # Validate input
    validated_data, error_response = validate_login(data)
    if error_response:
        return error_response
    
    # Check if user exists and password is correct
    user = Users.query.filter_by(email=validated_data["email"]).first()
    if not user or not user.check_password(validated_data["password"]):
        return jsonify({"msg": "Bad credentials"}), 401
    
    # Create JWT token and set it as HTTP cookie
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    # Store refresh token in database
    # Decode the refresh token to get its JTI
    decoded_token = decode_token(refresh_token)
    jti = decoded_token["jti"]
    db.session.add(RefreshToken(jti=jti, user_id=user.id))
    db.session.commit()
    
    # Return response with access and refresh tokens
    response = make_response(jsonify({"msg": "Login successful"}), 200)
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    return response


"""
The refresh function gets the refresh token from the request cookies and checks if it is valid.
If it is valid, it creates a new access token and returns it.
"""
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True, verify_type=True, locations=["cookies"])
def refresh():
    # Get the JWT token and user ID from the request cookies
    jti = get_jwt()["jti"]
    user_id = get_jwt_identity()
    
    # Check if the refresh token is valid and not revoked
    token = RefreshToken.query.filter_by(jti=jti, user_id=user_id).first()
    if not token or token.revoked:
        return jsonify({"msg": "Invalid refresh token"}), 401
    
    # Create a new access token
    access_token = create_access_token(identity=user_id)
    
    # Return response with new access token
    response = make_response(jsonify({"msg": "Token refreshed"}), 200)
    set_access_cookies(response, access_token)
    return response


"""
The logout function gets the JWT token from the request cookies and revokes the refresh token.
If the refresh token is valid and not revoked, it revokes it and returns a success message.
"""
@auth_bp.route("/logout", methods=["POST"])
@jwt_required(locations=["cookies"])
def logout():
    # Get the JWT token and user ID from the request cookies
    jti = get_jwt()["jti"]
    
    # Check if the refresh token is valid and not revoked
    token = RefreshToken.query.filter_by(jti=jti).first()
    if token: 
        token.revoked = True
        db.session.commit()
    
    # Return response with success message
    response = make_response(jsonify({"msg": "Logout successful"}), 200)
    unset_jwt_cookies(response)
    return response

