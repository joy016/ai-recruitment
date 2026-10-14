using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace ai_recruitment.Features.Users
{
    public static class InvitationTokenGenerator
    {
        // 32 bytes = 256 bits of entropy.
        private const int TokenByteLength = 32;

        public static string GenerateToken() =>
            WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(TokenByteLength));

        public static string Hash(string token)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(bytes);
        }
    }
}
