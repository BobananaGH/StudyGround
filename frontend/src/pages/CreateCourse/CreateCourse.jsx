// frontend/src/pages/CreateCourse/CreateCourse.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/ui/Button/Button.jsx";
import { post } from "../../services/api/client.js";
import { API_ENDPOINTS } from "../../services/api/endpoints.js";

import styles from "./CreateCourse.module.css";

export function CreateCourse() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Course name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const course = await post(API_ENDPOINTS.COURSES, {
        name: name.trim(),
        code: code.trim(),
        description: description.trim(),
      });

      navigate(`/courses/${course.id}`);
    } catch (error) {
      console.error("Failed to create course:", error);
      setError(error.message || "Unable to create course.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.createCourse}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>StudyGround</p>

        <h1 className={styles.title}>Create Course</h1>

        <p className={styles.subtitle}>
          Create a course and add your study materials.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="course-name">Course Name</label>

          <input
            id="course-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Triết học Mác - Lênin"
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="course-code">Course Code</label>

          <input
            id="course-code"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="e.g. TRIET101"
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="course-description">Description</label>

          <textarea
            id="course-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this course about?"
            rows={5}
            disabled={loading}
          />
        </div>

        {error && (
          <p className={styles.error} role="alert">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />

            <span>{error}</span>
          </p>
        )}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={loading}
            onClick={() => navigate("/dashboard")}
          >
            Cancel
          </Button>

          <Button type="submit" variant="primary" size="md" loading={loading}>
            Create Course
          </Button>
        </div>
      </form>
    </section>
  );
}

export default CreateCourse;
