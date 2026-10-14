using System.ComponentModel.DataAnnotations;

namespace ai_recruitment.Features.Users.Dto
{
    public class UpdatePhoneNumberDto
    {
        [Required]
        [StringLength(15)]
        [Phone]
        public string PhoneNumber { get; set; } = string.Empty;

    }
}
