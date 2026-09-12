import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import * as z from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username/email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.username, data.password);
      showToast('Đăng nhập thành công!', 'success');
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      showToast(
        error?.response?.data?.detail ||
          error?.response?.data?.error ||
          'Sai thông tin đăng nhập!',
        'error'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 shadow-md rounded-2xl p-8">
        <div className="mb-8 text-center">
          <span className="inline-block text-indigo-600 text-3xl font-bold mb-2">✦</span>
          <h1 className="text-2xl font-bold">Đăng nhập StudyGround</h1>
          <p className="text-gray-500 text-sm mt-1">Hệ trợ lý học tập AI - RAG</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Username / Email"
            autoComplete="username"
            {...register('username')}
            error={errors.username?.message}
          />
          <Input
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />

          <Button type="submit" fullWidth loading={isSubmitting}>
            {isSubmitting ? <Spinner size="sm" /> : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          <span>Bạn chưa có tài khoản? </span>
          <Link to="/register" className="text-indigo-600 hover:underline font-semibold">
            Đăng ký
          </Link>
        </div>
      </div>
    </div>
  );
}
