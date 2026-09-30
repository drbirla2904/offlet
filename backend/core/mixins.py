from rest_framework.response import Response
from rest_framework import status


class LoginRequiredActionMixin:
    """
    For ViewSets that let guests read but require login for specific
    actions (save, follow, review, report, chat, enquiry). Returns a
    consistent 401 payload the frontend uses to trigger the
    "Login to continue" modal instead of a hard redirect.
    """

    login_required_actions = ()

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if (
            getattr(self, "action", None) in self.login_required_actions
            and not request.user.is_authenticated
        ):
            from rest_framework.exceptions import NotAuthenticated

            raise NotAuthenticated(
                detail={
                    "code": "login_required",
                    "message": "Create a free account to save offers, follow shops "
                    "and receive local deal alerts.",
                }
            )
