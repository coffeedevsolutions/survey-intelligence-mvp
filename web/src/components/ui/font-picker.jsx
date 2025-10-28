/**
 * Font Picker Component
 * Supports Google Fonts selection and custom font upload
 */

import React, { useState, useEffect } from 'react';
import { Button } from './button.jsx';
import { API_BASE_URL } from '../../utils/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useNotifications } from './notifications.jsx';

export function FontPicker({ selectedFonts = [], onChange, orgId }) {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [googleFonts, setGoogleFonts] = useState([]);
  const [customFonts, setCustomFonts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const effectiveOrgId = orgId || user?.orgId;

  // Load Google Fonts in the head
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Montserrat:wght@400;700&family=Raleway:wght@400;700&family=Source+Sans+Pro:wght@400;700&family=Poppins:wght@400;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&family=Oswald:wght@400;700&family=Roboto+Condensed:wght@400;700&family=Ubuntu:wght@400;700&family=Lora:wght@400;700&family=Roboto+Slab:wght@400;700&family=Noto+Sans:wght@400;700&family=PT+Sans:wght@400;700&family=Titillium+Web:wght@400;700&family=Dosis:wght@400;700&family=Arimo:wght@400;700&family=PT+Serif:wght@400;700&family=Crimson+Text:wght@400;700&family=Fira+Sans:wght@400;700&family=Work+Sans:wght@400;700&family=Nunito:wght@400;700&family=Cabin:wght@400;700&family=Inconsolata:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (effectiveOrgId) {
      fetchAvailableFonts();
    }
  }, [effectiveOrgId]);

  const fetchAvailableFonts = async () => {
    setLoading(true);
    try {
      // Fetch Google Fonts
      const googleResponse = await fetch(
        `${API_BASE_URL}/api/orgs/${effectiveOrgId}/fonts/google`,
        { credentials: 'include' }
      );
      
      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        setGoogleFonts(googleData.fonts || []);
      }

      // Fetch custom fonts
      const customResponse = await fetch(
        `${API_BASE_URL}/api/orgs/${effectiveOrgId}/fonts`,
        { credentials: 'include' }
      );
      
      if (customResponse.ok) {
        const customData = await customResponse.json();
        setCustomFonts(customData.fonts || []);
      }
    } catch (error) {
      console.error('Error fetching fonts:', error);
      showError('Failed to load fonts');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFontSelect = (fontName) => {
    const updated = selectedFonts.includes(fontName)
      ? selectedFonts.filter(f => f !== fontName)
      : [...selectedFonts, fontName];
    onChange(updated);
  };

  const handleCustomFontUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['ttf', 'woff', 'woff2'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      showError('Invalid font file. Please upload .ttf, .woff, or .woff2 files.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Font file is too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('font', file);
    formData.append('fontName', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${effectiveOrgId}/fonts`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload font');
      }

      const result = await response.json();
      showSuccess('Font uploaded successfully');
      
      // Reload custom fonts
      await fetchAvailableFonts();
      
      // Add to selected fonts
      if (result.font) {
        handleGoogleFontSelect(result.font.font_family);
      }

      setShowUpload(false);
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading font:', error);
      showError(error.message || 'Failed to upload font');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCustomFont = async (fontId) => {
    if (!confirm('Are you sure you want to delete this font?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orgs/${effectiveOrgId}/fonts/${fontId}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete font');
      }

      showSuccess('Font deleted successfully');
      await fetchAvailableFonts();
    } catch (error) {
      console.error('Error deleting font:', error);
      showError('Failed to delete font');
    }
  };

  // Popular Google Fonts that are always available
  const popularFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Raleway', 'Source Sans Pro', 'Poppins', 'Merriweather',
    'Playfair Display', 'Oswald', 'Roboto Condensed', 'Ubuntu',
    'Lora', 'Roboto Slab', 'Noto Sans', 'PT Sans', 'Titillium Web',
    'Dosis', 'Arimo', 'PT Serif', 'Droid Sans', 'Crimson Text',
    'Fira Sans', 'Work Sans', 'Nunito', 'Cabin', 'Inconsolata',
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Comic Sans MS', 'Courier New', 'Trebuchet MS', 'Tahoma', 'Lucida Sans'
  ];

  // Combine popular fonts with fetched Google Fonts, remove duplicates
  const allFonts = [...new Set([...popularFonts, ...googleFonts])];
  
  // Filter fonts based on search query
  const filteredFonts = allFonts.filter(font =>
    font.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show popular fonts first when no search query
  const sortedFonts = searchQuery 
    ? filteredFonts 
    : [...popularFonts, ...filteredFonts.filter(f => !popularFonts.includes(f))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Available Fonts
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? 'Cancel Upload' : '+ Upload Custom Font'}
        </Button>
      </div>

      {showUpload && (
        <div className="p-4 border border-gray-300 rounded-md bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Font File (.ttf, .woff, or .woff2)
          </label>
          <input
            type="file"
            accept=".ttf,.woff,.woff2"
            onChange={handleCustomFontUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {uploading && (
            <p className="mt-2 text-sm text-gray-600">Uploading font...</p>
          )}
        </div>
      )}

      {/* Google Fonts Section */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Google Fonts
        </h4>
        
        <input
          type="text"
          placeholder={searchQuery ? "Search fonts..." : "Type to search or browse popular fonts..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3"
        />

        {loading ? (
          <p className="text-sm text-gray-600">Loading fonts...</p>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
            {sortedFonts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                {searchQuery ? `No fonts found matching "${searchQuery}"` : 'Browse available fonts above'}
              </p>
            ) : (
              <div className="space-y-1">
                {sortedFonts.map((font) => (
                  <label
                    key={font}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFonts.includes(font)}
                      onChange={() => handleGoogleFontSelect(font)}
                      className="rounded border-gray-300"
                    />
                    <span style={{ fontFamily: font }} className="text-sm flex-1">
                      {font}
                    </span>
                    {selectedFonts.includes(font) && (
                      <span className="text-blue-600 text-xs">✓</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Fonts Section */}
      {customFonts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Custom Fonts
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
            {customFonts.map((font) => (
              <div
                key={font.id}
                className="flex items-center justify-between p-2 hover:bg-gray-100 rounded"
              >
                <label className="flex items-center space-x-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={selectedFonts.includes(font.font_family)}
                    onChange={() => handleGoogleFontSelect(font.font_family)}
                    className="rounded border-gray-300"
                  />
                  <span style={{ fontFamily: font.font_family }} className="text-sm">
                    {font.font_family}
                  </span>
                  <span className="text-xs text-gray-500">(custom)</span>
                </label>
                <button
                  onClick={() => handleDeleteCustomFont(font.id)}
                  className="text-red-600 hover:text-red-800 text-sm px-2"
                  title="Delete font"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Fonts Preview */}
      {selectedFonts.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Selected Fonts ({selectedFonts.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedFonts.map((font) => (
              <span
                key={font}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {font}
                <button
                  onClick={() => handleGoogleFontSelect(font)}
                  className="ml-2 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FontPicker;

