import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import * as z from 'zod';

const registerSchema = z.object({
  username: z.string().min(3, 'Tên người dùng ít nhất 3 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu ít nhất 8 ký tự'),
  confirmPassword: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      showToast('Đăng ký thành công!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      const detail = error?.response?.data;
      if (detail) {
        if (typeof detail === 'object') {
          for (const [key, val] of Object.entries(detail)) {
            if (Array.isArray(val)) {
              showToast(`${key}: ${val[0]}`, 'error');
            } else {
              showToast(`${key}: ${val}`, 'error');
            }
          }
        } else {
          showToast(detail, 'error');
        }
      } else {
        showToast('Không thể kết nối máy chủ!', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 shadow-md rounded-2xl p-8">
        <div className="mb-8 text-center">
          <span className="inline-block text-indigo-600 text-3xl font-bold mb-2">✦</span>
          <h1 className="text-2xl font-bold">Tạo tài khoản StudyGround</h1>
          <p className="text-gray-500 text-sm mt-1">Bắt đầu học tập thông minh ngay hôm nay</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Tên đăng nhập"
            placeholder="min 3 ký tự"
            autoComplete="username"
            {...register('username')}
            error={errors.username?.message}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Mật khẩu"
            type="password"
            placeholder="Ít nhất 8 ký tự"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <Input
            label="Xác nhận mật khẩu"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <Input
            label="Họ (tùy chọn)"
            autoComplete="given-name"
            {...register('first_name')}
          />
          <Input
            label="Tên (tùy chọn)"
            autoComplete="family-name"
            {...register('last_name')}
          />

          <Button type="submit" fullWidth loading={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : 'Đăng ký'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          <span>Đã có tài khoản? </span>
          <Link to="/login" className="text-indigo-600 hover:underline font-semibold">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}