import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { courseApi, conversationApi } from '@/api';
import { Button, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
}

interface Conversation {
  id: number;
  title: string;
  course_id: number | null;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [coursesRes, convRes] = await Promise.all([
        courseApi.list(),
        conversationApi.list(),
      ]);
      setCourses(coursesRes.data);
      setConversations(convRes.data);
    } catch (error: any) {
      showToast('Không tải được dữ liệu: ' + (error.response?.data?.detail || 'Lỗi máy chủ'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    user?.email;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const recentConvs = conversations.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium">{greeting}, {displayName}!</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">
            Tiếp tục hành trình học tập của bạn
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Quản lý khóa học, tài liệu và cuộc trò chuyện AI
          </p>
        </div>
        <Link to="/courses/new">
          <Button variant="primary" size="lg">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m6-6H6" />
            </svg>
            Tạo khóa học mới
          </Button>
        </Link>
      </section>

      {/* Courses Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Khóa học của bạn</h2>
          <Link to="/courses/new">
            <Button variant="outline" size="sm">+ Tạo mới</Button>
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Chưa có khóa học nào</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Tạo khóa học đầu tiên để bắt đầu</p>
            <Link to="/courses/new" className="mt-4 inline-block">
              <Button variant="primary">Tạo khóa học</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-full mb-3">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {course.code || 'No code'}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{course.name}</h3>
                      {course.description && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Conversations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cuộc trò chuyện gần đây</h2>
        </div>

        {conversations.slice(0, 5).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a3 3 0 01-3-3V9a3 3 0 013-3h14a3 3 0 013 3v4" />
            </svg>
            <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-white">Chưa có cuộc trò chuyện</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Bắt đầu từ trang chi tiết khóa học</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentConvs.map((conv) => (
              <Link key={conv.id} to={`/conversations/${conv.id}`}>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a3 3 0 01-3-3V9a3 3 0 013-3h14a3 3 0 013 3v4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">{conv.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {conv.course_id ? 'Đang học khóa học' : 'Cuộc trò chuyện chung'} ·{' '}
                      {new Date(conv.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <svg className="h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}