namespace ai_recruitment.Features.Security.Dto
{
    /// <summary>Optional body for POST /api/Security/logoutAllSessions. Omit the body for the default (false).</summary>
    /// <example>{ "keepCurrent": false }</example>
    public class LogoutAllSessionsDto
    {
        /// <summary>When true, the session making this request is left active.</summary>
        public bool KeepCurrent { get; set; }
    }
}
