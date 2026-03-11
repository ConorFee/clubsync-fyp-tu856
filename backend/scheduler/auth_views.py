from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


def _user_response(user):
    """Build a consistent user info dict for login and me responses."""
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': profile.role if profile else 'viewer',
        'team': profile.team.name if profile and profile.team else None,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user and start a session."""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password are required.'}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'error': 'Invalid credentials.'}, status=401)

    login(request, user)
    get_token(request)  # Force CSRF cookie in the response
    return Response({'success': True, 'user': _user_response(user)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """End the current session."""
    logout(request)
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return the current authenticated user's info. Also sets the CSRF cookie."""
    get_token(request)  # Force CSRF cookie in the response
    return Response({'success': True, 'user': _user_response(request.user)})
