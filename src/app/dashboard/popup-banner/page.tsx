'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';
import { getPopupBanner, savePopupBanner, togglePopupBanner, PopupBanner } from '@/lib/firestore';

export default function PopupBannerPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<PopupBanner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    isActive: false,
  });

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    setLoading(true);
    try {
      const data = await getPopupBanner();
      if (data) {
        setBanner(data);
        setFormData({
          title: data.title,
          imageUrl: data.imageUrl,
          linkUrl: data.linkUrl,
          isActive: data.isActive,
        });
      }
    } catch (error) {
      console.error('Error loading popup banner:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await savePopupBanner(formData);
      await loadBanner();
      alert('Popup banner saved successfully!');
    } catch (error) {
      console.error('Error saving popup banner:', error);
      alert('Error saving popup banner');
    }
    setSaving(false);
  };

  const handleToggle = async () => {
    try {
      await togglePopupBanner(!formData.isActive);
      setFormData({ ...formData, isActive: !formData.isActive });
    } catch (error) {
      console.error('Error toggling popup banner:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Popup Banner</h1>
          <p className="text-gray-400 mt-1">
            Configure the floating popup banner that appears in the app
          </p>
        </div>
        <button
          onClick={handleToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            formData.isActive
              ? 'bg-green-900/50 text-green-400 border border-green-700/50 hover:bg-green-900/70'
              : 'bg-[#252540] text-gray-400 border border-[#3a3a55] hover:bg-[#2a2a50]'
          }`}
        >
          {formData.isActive ? (
            <>
              <Eye className="w-4 h-4" />
              Active
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              Inactive
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-[#1a1a2e] rounded-xl shadow-lg border border-[#2a2a45] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Banner Settings</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Title (for reference)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-[#252540] border border-[#3a3a55] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., Facebook Promo Banner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Image URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-3 py-2 bg-[#252540] border border-[#3a3a55] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://scontent.facebook.com/..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste the direct image URL from Facebook or any image hosting service
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Link URL (opens on tap) <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                className="w-full px-3 py-2 bg-[#252540] border border-[#3a3a55] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://www.facebook.com/..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The Facebook page or post URL to open when user taps the banner
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Banner
                </>
              )}
            </button>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-[#1a1a2e] rounded-xl shadow-lg border border-[#2a2a45] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>
          <div className="bg-[#252540] rounded-lg p-4 min-h-[300px] flex items-center justify-center border border-[#3a3a55]">
            {formData.imageUrl ? (
              <div className="relative">
                <img
                  src={formData.imageUrl}
                  alt="Banner Preview"
                  className="max-w-full max-h-[400px] rounded-lg shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Invalid+Image+URL';
                  }}
                />
                {formData.linkUrl && (
                  <a
                    href={formData.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 bg-[#1a1a2e]/90 p-2 rounded-full shadow hover:bg-[#1a1a2e] transition-colors border border-[#3a3a55]"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-300" />
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p>Enter an image URL to see preview</p>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">
            This is how the popup will appear in the app (floating in bottom-right corner)
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-400 mb-2">How to get Facebook image URL:</h3>
        <ol className="list-decimal list-inside text-sm text-blue-300 space-y-1">
          <li>Open the Facebook post/image you want to use</li>
          <li>Right-click on the image and select &quot;Copy image address&quot;</li>
          <li>Paste the URL in the Image URL field above</li>
          <li>For the Link URL, copy the Facebook post/page URL from your browser</li>
        </ol>
      </div>
    </div>
  );
}
