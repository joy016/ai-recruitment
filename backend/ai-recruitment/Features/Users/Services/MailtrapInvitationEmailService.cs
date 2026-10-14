using ai_recruitment.Features.Users.Model;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace ai_recruitment.Features.Users.Services
{
    // Sends the invitation email via SMTP against Mailtrap Sandbox (or any SMTP relay -
    // swap the Email:Smtp:* config for a production provider when ready to actually deliver
    // mail instead of capturing it in a sandbox inbox).
    public class MailtrapInvitationEmailService : IInvitationEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<MailtrapInvitationEmailService> _logger;

        public MailtrapInvitationEmailService(IConfiguration configuration, ILogger<MailtrapInvitationEmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendInvitationEmailAsync(User user, string rawToken, CancellationToken cancellationToken = default)
        {
            var smtpSection = _configuration.GetSection("Email:Smtp");
            var host = smtpSection["Host"];
            var portValue = smtpSection["Port"];
            var username = smtpSection["Username"];
            var password = smtpSection["Password"];
            var fromAddress = smtpSection["FromAddress"];
            var fromName = smtpSection["FromName"] ?? "AI Recruitment Hub";

            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(portValue) ||
                string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) ||
                string.IsNullOrWhiteSpace(fromAddress))
            {
                _logger.LogWarning(
                    "Email:Smtp configuration is incomplete; skipping invitation email for user {UserId}.",
                    user.Id);
                return false;
            }

            var frontendBaseUrl = _configuration["Frontend:BaseUrl"];
            if (string.IsNullOrWhiteSpace(frontendBaseUrl))
            {
                _logger.LogError(
                    "Frontend:BaseUrl is not configured; cannot build an invitation link for user {UserId}.",
                    user.Id);
                return false;
            }

            if (!int.TryParse(portValue, out var port))
            {
                _logger.LogError("Email:Smtp:Port ('{Port}') is not a valid number.", portValue);
                return false;
            }

            // The raw token only ever appears in this URL, inside the one email sent to the
            // invited user. It is never logged and never returned from any API response.
            var activationUrl = $"{frontendBaseUrl.TrimEnd('/')}/set-password?token={Uri.EscapeDataString(rawToken)}";

            var message = BuildMessage(user, fromAddress, fromName, activationUrl);

            try
            {
                using var client = new SmtpClient();
                await client.ConnectAsync(host, port, SecureSocketOptions.StartTlsWhenAvailable, cancellationToken);
                await client.AuthenticateAsync(username, password, cancellationToken);
                await client.SendAsync(message, cancellationToken);
                await client.DisconnectAsync(true, cancellationToken);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send invitation email for user {UserId} via SMTP host {Host}.", user.Id, host);
                return false;
            }
        }

        private static MimeMessage BuildMessage(User user, string fromAddress, string fromName, string activationUrl)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromAddress));
            message.To.Add(new MailboxAddress($"{user.FirstName} {user.LastName}", user.Email));
            message.Subject = "Welcome to AI Recruitment Hub - Create your password";

            var plainText =
                $"""
                Hi {user.FirstName},

                Welcome to AI Recruitment Hub! An account has been created for you.

                Create your password to activate your account:
                {activationUrl}

                This link expires in 24 hours.

                If you weren't expecting this invitation, please contact your administrator.
                """;

            var html =
                $"""
                <p>Hi {user.FirstName},</p>
                <p>Welcome to <strong>AI Recruitment Hub</strong>! An account has been created for you.</p>
                <p><a href="{activationUrl}">Create your password</a> to activate your account.</p>
                <p>This link expires in 24 hours.</p>
                <p>If you weren't expecting this invitation, please contact your administrator.</p>
                """;

            message.Body = new BodyBuilder
            {
                TextBody = plainText,
                HtmlBody = html,
            }.ToMessageBody();

            return message;
        }
    }
}
