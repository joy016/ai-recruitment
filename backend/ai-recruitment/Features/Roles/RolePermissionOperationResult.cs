using ai_recruitment.Features.Roles.Dto;

namespace ai_recruitment.Features.Roles
{
    public enum RolePermissionOutcome
    {
        Success,
        RoleNotFound,
        InvalidPermissionNames,
        AssignmentNotFound,
        WouldRemoveLastAdministrativeAccess,
    }

    public class RolePermissionOperationResult
    {
        public RolePermissionOutcome Outcome { get; init; }
        public string? Message { get; init; }
        public IReadOnlyList<string>? InvalidPermissions { get; init; }
        public RolePermissionsDto? Data { get; init; }

        public bool Succeeded => Outcome == RolePermissionOutcome.Success;

        public static RolePermissionOperationResult Success(RolePermissionsDto data) =>
            new() { Outcome = RolePermissionOutcome.Success, Data = data };

        public static RolePermissionOperationResult Fail(
            RolePermissionOutcome outcome,
            string message,
            IReadOnlyList<string>? invalidPermissions = null) =>
            new() { Outcome = outcome, Message = message, InvalidPermissions = invalidPermissions };
    }
}
