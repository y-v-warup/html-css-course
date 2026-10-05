import Footer from "../components/Footer";
import Header from "../components/Header";
import About from "../components/home/About";
import Compliance from "../components/home/Compliance";
import CtaBand from "../components/home/CtaBand";
import Features from "../components/home/Features";
import Hero from "../components/home/Hero";
import HowItWorks from "../components/home/HowItWorks";
import TechStack from "../components/home/TechStack";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Compliance />
        <TechStack />
        <About />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}
