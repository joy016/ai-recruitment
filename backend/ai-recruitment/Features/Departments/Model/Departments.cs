using ai_recruitment.Features.Users.Model;

namespace ai_recruitment.Features.Departments.Model
{
    public class Department
    {
        public int Id { get; set; }
        public string? DepartmentName { get; set; }

        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
