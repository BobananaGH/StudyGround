import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { courseApi, conversationApi } from '@/api';
import { Button, Input, Spinner, Modal, useToast } from '@/components/ui';

interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
  aliases: string[];
}

interface Document {
  id: number;
  title: string;
  file_type: string;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');

  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [deleteDocOpen, setDeleteDocOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  const loadData = async () => {
    try {
      const [courseRes, docsRes] = await Promise.all([
        courseApi.get(Number(courseId)),
        courseApi.getDocuments(Number(courseId)),
      ]);
      setCourse(courseRes.data);
      setDocuments(docsRes.data);
    } catch (error: any) {
      showToast('Không tải được khóa học', 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const refreshDocuments = async () => {
    try {
      const docsRes = await courseApi.getDocuments(Number(courseId));
      setDocuments(docsRes.data);
    } catch (error: any) {
      showToast('Lỗi tải tài liệu', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const name = file.name.replace(/\.(pdf|docx)$/i, '');
      setDocumentTitle(name);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Chọn file PDF hoặc DOCX', 'warning');
      return;
    }

    try {
      setUploading(true);
      await courseApi.uploadDocument(selectedFile, Number(courseId), documentTitle.trim() || selectedFile.name);
      showToast('Tải tài liệu thành công!', 'success');
      setSelectedFile(null);
      setDocumentTitle('');
      const fileInput = document.getElementById('doc-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await refreshDocuments();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Lỗi tải tài liệu', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCourse = async () => {
    try {
      await courseApi.delete(Number(courseId));
      showToast('Đã xóa khóa học', 'success');
      navigate('/dashboard');
    } catch (error: any) {
      showToast('Lỗi xóa khóa học', 'error');
    } finally {
      setDeleteCourseOpen(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    try {
      await courseApi.deleteDocument(docToDelete.id);
      showToast('Đã xóa tài liệu', 'success');
      await refreshDocuments();
    } catch (error: any) {
      showToast('Lỗi xóa tài liệu', 'error');
    } finally {
      setDeleteDocOpen(false);
      setDocToDelete(null);
    }
  };

  const handleStartChat = async () => {
    try {
      setStartingChat(true);

      const convsRes = await conversationApi.list();
      const courseConvs = (convsRes.data || [])
        .filter((c) => c.course_id === Number(courseId))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (courseConvs.length > 0) {
        navigate(`/conversations/${courseConvs[0].id}`);
        return;
      }

      const convRes = await conversationApi.create({
        title: `${course?.name || 'Course'} Study Session`,
        course_id: Number(courseId),
      });
      navigate(`/conversations/${convRes.data.id}`);
    } catch (error: any) {
      showToast('Lỗi tạo cuộc trò chuyện', 'error');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium">{course.code || 'Course'}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.name}</h1>
          {course.description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{course.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h14V10" />
              </svg>
            </Button>
          </Link>
          <button
            onClick={() => setDeleteCourseOpen(true)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            aria-label="Delete course"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.133A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.867L5 7m5 5v5m3-5v5m-1-11h-4l1-5h6l1 5z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Study Materials */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tài liệu học tập</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{documents.length} tài liệu</p>
          </div>
          <div className="flex gap-2">
            {documents.length > 0 && (
              <Button
                variant="primary"
                loading={startingChat}
                onClick={handleStartChat}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a3 3 0 01-3-3V9a3 3 0 013-3h14a3 3 0 013 3v4" />
                </svg>
                Bắt đầu học
              </Button>
            )}
          </div>
        </div>

        <div className="p-6">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h10v10a2 2 0 002 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Chưa có tài liệu</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">Tải lên PDF hoặc DOCX để bắt đầu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10a2 2 0 002 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{doc.file_type || 'Document'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setDocToDelete(doc); setDeleteDocOpen(true); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-2"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.133A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.867L5 7m5 5v5m3-5v5m-1-11h-4l1-5h6l1 5z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Form */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Thêm tài liệu</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chọn file (PDF hoặc DOCX)
                </label>
                <label className="relative cursor-pointer">
                  <input
                    id="doc-file"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="sr-only"
                  />
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    selectedFile
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                  }`}>
                    <div className="flex flex-col items-center gap-2">
                      <svg className={`h-10 w-10 ${selectedFile ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedFile ? selectedFile.name : 'Kéo thả hoặc click để chọn file'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedFile ? 'Click để chọn file khác' : 'PDF, DOCX · Tối đa 50MB'}
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              <Input
                label="Tiêu đề tài liệu (tùy chọn)"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Ví dụ: Chương 1 - Giới thiệu"
                disabled={uploading}
              />

              <Button type="submit" variant="primary" fullWidth loading={uploading} disabled={!selectedFile || uploading}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Tải tài liệu
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Delete Course Modal */}
      <Modal
        isOpen={deleteCourseOpen}
        onClose={() => setDeleteCourseOpen(false)}
        title="Xóa khóa học?"
        description={`"${course.name}" và tất cả tài liệu, hội thoại liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa khóa học"
        cancelLabel="Hủy"
        onConfirm={handleDeleteCourse}
        variant="danger"
      />

      {/* Delete Document Modal */}
      <Modal
        isOpen={deleteDocOpen}
        onClose={() => { setDeleteDocOpen(false); setDocToDelete(null); }}
        title="Xóa tài liệu?"
        description={docToDelete ? `"${docToDelete.title}" sẽ bị xóa vĩnh viễn.` : ''}
        confirmLabel="Xóa tài liệu"
        cancelLabel="Hủy"
        onConfirm={handleDeleteDocument}
        variant="danger"
      />
    </div>
  );
}