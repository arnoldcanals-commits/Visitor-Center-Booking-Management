from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required

def role_required(required_role):
    """
    Only allow users with a specific role to access a view.
    Redirect others to unauthorized page.
    """
    def decorator(view_func):
        @login_required
        def _wrapped_view(request, *args, **kwargs):
            if request.user.role != required_role:
                return redirect("unauthorized")  
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
