from flask import Blueprint, request, jsonify, make_response
from models import db, Users
from flask_jwt_extended import create_access_token, set_access_cookies
from schemas import validate_register, validate_login


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
    
    # Create JWT token and set it as HTTP cookie (auto-login after registration)
    access_token = create_access_token(identity=user.id)
    response = make_response(jsonify({"msg": "User created successfully"}), 201)
    set_access_cookies(response, access_token)
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
    response = make_response(jsonify({"msg": "Login successful"}), 200)
    set_access_cookies(response, access_token)
    return response
