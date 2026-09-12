import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseApi } from '@/api';
import { Button, Input, useToast } from '@/components/ui';

export default function CreateCourse() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Tên khóa học là bắt buộc', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await courseApi.create({
        name: name.trim(),
        code: code.trim(),
        description: description.trim(),
      });
      showToast('Tạo khóa học thành công!', 'success');
      navigate(`/courses/${res.data.id}`);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Lỗi tạo khóa học', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tạo khóa học mới</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Tạo khóa học để tải tài liệu và bắt đầu trò chuyện RAG AI</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <Input
          label="Tên khóa học *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Triết học Mác - Lênin"
          disabled={loading}
          required
        />

        <Input
          label="Mã khóa học"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ví dụ: TRIET101"
          disabled={loading}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mô tả khóa học
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nội dung chính của khóa học này..."
            rows={4}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!name.trim() || loading}>
            Tạo khóa học
          </Button>
        </div>
      </form>
    </div>
  );
}