from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allows access only to users with admin role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'profile') and request.user.profile.role == 'admin'


class IsCoachOrAdmin(BasePermission):
    """Allows access to users with coach or admin role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ('admin', 'coach')
