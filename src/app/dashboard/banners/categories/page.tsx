'use client';

import { useState } from 'react';
import { Info, Upload, Image } from 'lucide-react';

interface CategorySize {
  name: string;
  width: number;
  height: number;
  ratio: string;
  description: string;
}

const categorySizes: CategorySize[] = [
  {
    name: 'Gear Category Icons',
    width: 200,
    height: 200,
    ratio: '1:1',
    description: 'Icons for Cameras, Lenses, Lighting, Audio, Grip, Drones, Storage, Accessories',
  },
  {
    name: 'Crew Category Icons',
    width: 200,
    height: 200,
    ratio: '1:1',
    description: 'Icons for Director, Cinematographer, Gaffer, Editor, etc.',
  },
  {
    name: 'Service Grid Icons',
    width: 300,
    height: 300,
    ratio: '1:1',
    description: 'Main service icons: Gear, Crew, Influencers, Jobs, Promote, Locations',
  },
  {
    name: 'Location Category Icons',
    width: 200,
    height: 200,
    ratio: '1:1',
    description: 'Icons for Studios, House, Palace, Park locations',
  },
];

const bannerSizes = [
  {
    name: 'Hero Banner',
    width: 1200,
    height: 400,
    ratio: '3:1',
    mobileMin: '750 x 250 px',
    description: 'Main carousel banner on home screen',
    location: 'Home Screen - Top',
  },
  {
    name: 'Coming Soon Banner',
    width: 800,
    height: 300,
    ratio: '8:3',
    mobileMin: '400 x 150 px',
    description: 'Promotional banner for upcoming features',
    location: 'Home Screen - Bottom',
  },
  {
    name: 'Promotion Banner',
    width: 600,
    height: 200,
    ratio: '3:1',
    mobileMin: '300 x 100 px',
    description: 'Video promotion section banner',
    location: 'Home Screen - Promote Your Videos',
  },
];

export default function CategoryBannersPage() {
  const [activeTab, setActiveTab] = useState<'icons' | 'banners'>('icons');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Image Size Guidelines</h1>
        <p className="text-gray-600">Reference guide for all image uploads in the FilmGrid app</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('icons')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'icons'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Category Icons
        </button>
        <button
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'banners'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Banners
        </button>
      </div>

      {activeTab === 'icons' ? (
        <div className="space-y-6">
          {/* Category Icons */}
          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Image className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Category Icon Specifications</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {categorySizes.map((cat) => (
                <div key={cat.name} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Size:</span> {cat.width} x {cat.height} px
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Ratio:</span> {cat.ratio}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">{cat.description}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-center rounded bg-gray-100 p-4">
                    <div
                      className="border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-400 text-xs"
                      style={{
                        width: Math.min(cat.width / 2, 100),
                        height: Math.min(cat.height / 2, 100),
                      }}
                    >
                      {cat.width}x{cat.height}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* General Guidelines */}
            <div className="mt-6 rounded-lg bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">General Icon Guidelines</h4>
                  <ul className="mt-2 space-y-1 text-sm text-amber-700">
                    <li>• Use PNG format with transparent background</li>
                    <li>• Keep icons simple and recognizable at small sizes</li>
                    <li>• Use consistent style across all icons</li>
                    <li>• Max file size: 100KB per icon</li>
                    <li>• Icons are displayed at 32-72px in the app</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Icon Upload Location */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Icon File Locations</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <code className="bg-gray-200 px-2 py-1 rounded text-xs">assets/icons/</code>
                <span className="text-gray-600">Main gear icons (camera.png, lens.png, etc.)</span>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <code className="bg-gray-200 px-2 py-1 rounded text-xs">assets/icons/crew/</code>
                <span className="text-gray-600">Crew role icons (director.png, cinematographer.png, etc.)</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Banner Specifications */}
          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Banner Specifications</h2>
            </div>

            <div className="space-y-4">
              {bannerSizes.map((banner) => (
                <div key={banner.name} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{banner.name}</h3>
                      <p className="text-sm text-gray-500">{banner.description}</p>
                      <p className="text-xs text-blue-600 mt-1">📍 {banner.location}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-gray-900">{banner.width} x {banner.height} px</p>
                      <p className="text-gray-500">Ratio: {banner.ratio}</p>
                      <p className="text-gray-400 text-xs">Min: {banner.mobileMin}</p>
                    </div>
                  </div>
                  
                  {/* Visual Preview */}
                  <div className="mt-4 flex items-center justify-center rounded bg-gray-100 p-4">
                    <div
                      className="border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center text-blue-500 text-xs font-medium"
                      style={{
                        width: Math.min(banner.width / 3, 300),
                        height: Math.min(banner.height / 3, 100),
                      }}
                    >
                      {banner.width} x {banner.height}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* General Guidelines */}
            <div className="mt-6 rounded-lg bg-green-50 p-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800">Banner Upload Guidelines</h4>
                  <ul className="mt-2 space-y-1 text-sm text-green-700">
                    <li>• Use JPG, PNG, or WebP format</li>
                    <li>• Optimize images for web (compress before upload)</li>
                    <li>• Max file size: 500KB for fast loading</li>
                    <li>• Ensure text is readable on mobile devices</li>
                    <li>• Test banners on both light and dark backgrounds</li>
                    <li>• Keep important content in the center (safe zone)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Banner Management */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Coming Soon Banner</h2>
            <p className="text-sm text-gray-600 mb-4">
              The &quot;Coming Soon&quot; banner is currently hardcoded in the app. To customize it:
            </p>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700">Current Location:</p>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded mt-1 inline-block">
                  lib/screens/home_screen.dart - Line ~624
                </code>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-700">To make it dynamic:</p>
                <p className="text-blue-600 text-xs mt-1">
                  Create a Firestore collection &quot;coming_soon_banners&quot; and update the app to fetch from it.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
