"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { submitContact, ContactData } from "@/services/contactService";
import SuccessModal from "@/components/Common/SuccessModal";

const ContactForm = () => {
  const t = useTranslations();
  const [formData, setFormData] = useState<ContactData>({
    name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string | null;
  }>({
    type: null,
    message: null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: null });

    try {
      await submitContact(formData);
      setIsModalOpen(true);
      setFormData({
        name: "",
        phone: "",
        email: "",
        message: "",
      });
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "Có lỗi xảy ra, vui lòng thử lại sau.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="relative space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="body-1 text-white block">
              {t("contact.form.name.title")}
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder={t("contact.form.name.placeholder")}
              className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="body-1 text-white block">
              {t("contact.form.phone.title")}
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder={t("contact.form.phone.placeholder")}
              className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="body-1 text-white block">
            {t("contact.form.email.title")}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder={t("contact.form.email.placeholder")}
            className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="body-1 text-white block">
            {t("contact.form.message.title")}
          </label>
          <textarea
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            required
            placeholder={t("contact.form.message.placeholder")}
            className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-secondary transition-all resize-none"
          />
        </div>

        {status.message && status.type === "error" && (
          <div className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700">
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`btn btn-secondary !w-full ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {loading ? "..." : t("button.submit-form")}
        </button>
      </form>

      <SuccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("modal.success.title")}
        message={t("modal.success.message")}
        buttonText={t("modal.success.button")}
      />
    </>
  );
};


export default ContactForm;
