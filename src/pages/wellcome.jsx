// src/pages/WelcomePage.jsx
import ExperienceBanner from "../components/ExperienceBanner";
import ImageGenerator from "../components/ImageGenerator";
import AboutSection from "../components/AboutSection"
import AdvertBanner from "../components/AdvertBanner";
import VehicleResultsSection from "../components/VehicleResultsSection";

export default function WelcomePage() {
  return (
    <>
      <ExperienceBanner />
      <ImageGenerator />
     <AdvertBanner />
       <VehicleResultsSection />
       <AboutSection />
    </>
  );
}
