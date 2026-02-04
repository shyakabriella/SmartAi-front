// src/pages/BookingConfirmationPage.jsx
import { useLocation, useNavigate } from "react-router-dom";
import BookingConfirmationCard from "../components/BookingConfirmationCard.jsx";

export default function BookingConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const bookingId =
    location.state?.bookingId ||
    location.state?.order?.id ||
    "#SC-2241117-0042";

  const handleViewTrip = () => {
    navigate("/trips", {
      state: { bookingId },
    });
  };

  const handleDownloadInvoice = () => {
    alert("Invoice download will be implemented here.");
  };

  const handleBackHome = () => navigate("/");

  return (
    <section className="bg-slate-100 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BookingConfirmationCard
          bookingId={bookingId}
          onViewTrip={handleViewTrip}
          onDownloadInvoice={handleDownloadInvoice}
          onBackHome={handleBackHome}
        />
      </div>
    </section>
  );
}
