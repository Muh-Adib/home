import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageSquare, CornerDownRight, Image as ImageIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Review {
  id: number;
  guest_name: string;
  rating: number;
  comment?: string;
  photo_path?: string;
  admin_response?: string;
  created_at: string;
}

interface PropertyReviewsProps {
  reviews?: Review[];
  ratingAvg?: number;
  reviewsCount?: number;
}

export const PropertyReviews: React.FC<PropertyReviewsProps> = ({
  reviews = [],
  ratingAvg = 0,
  reviewsCount = 0,
}) => {
  const { t } = useTranslation();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const numericRatingAvg = Number(ratingAvg) || 0;

  const renderStars = (rating: number, size = 4) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-${size} h-${size} ${
              i < rating
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-200 fill-slate-100'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Header Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-100/50">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-base font-semibold text-slate-500 uppercase tracking-wider">
              Ulasan Tamu
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <span className="text-4xl sm:text-5xl font-black text-slate-800">
                {numericRatingAvg > 0 ? numericRatingAvg.toFixed(1) : '-'}
              </span>
              <div className="space-y-1 text-center sm:text-left">
                {renderStars(Math.round(numericRatingAvg), 5)}
                <p className="text-xs text-slate-500 font-medium">
                  Rata-rata dari {reviewsCount} ulasan terverifikasi
                </p>
              </div>
            </div>
          </div>

          <div className="hidden sm:block border-l border-slate-200 h-16 mx-6"></div>

          <div className="flex items-center gap-3 text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-sm shrink-0">
            <MessageSquare className="w-8 h-8 text-blue-500" />
            <div className="text-left">
              <span className="text-sm font-bold text-slate-700 block">
                {reviews.length} Terbaru
              </span>
              <span className="text-xs text-slate-500">
                Menampilkan ulasan terbaru
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-500 font-medium text-sm">Belum ada ulasan untuk property ini.</p>
          <p className="text-xs text-slate-400">Jadilah tamu pertama yang memberikan ulasan setelah check-out!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className="border border-slate-100 shadow-sm bg-white overflow-hidden rounded-2xl transition-all hover:shadow-md"
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Review Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                      {review.guest_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm sm:text-base">
                        {review.guest_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {renderStars(review.rating, 3.5)}
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comment Text */}
                {review.comment && (
                  <p className="text-slate-600 text-sm sm:text-base italic leading-relaxed pl-1 border-l-2 border-slate-200">
                    "{review.comment}"
                  </p>
                )}

                {/* Photo Attachments */}
                {review.photo_path && (
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden cursor-pointer group shadow border border-slate-100 hover:opacity-90 transition-opacity">
                    <img
                      src={`/storage/${review.photo_path}`}
                      className="w-full h-full object-cover"
                      alt="Ulasan Tamu"
                      onClick={() => setSelectedPhoto(`/storage/${review.photo_path}`)}
                    />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}

                {/* Admin Response */}
                {review.admin_response && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 sm:p-4 mt-3 flex gap-2.5 items-start">
                    <CornerDownRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-700">
                        Tanggapan Pengelola
                      </span>
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                        {review.admin_response}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedPhoto}
            className="max-w-full max-h-[90vh] rounded-lg object-contain shadow-2xl"
            alt="Ulasan Lengkap"
          />
        </div>
      )}
    </div>
  );
};
