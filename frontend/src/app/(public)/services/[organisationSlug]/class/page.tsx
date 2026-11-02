"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  X,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Share2,
  Clock,
  CreditCard,
  GraduationCap,
  Sparkles,
  MessageSquare,
  AlertCircle,
  Loader2,
  Send,
  Search,
  ShieldCheck,
  Tag,
  ChevronRight,
  Layers,
  Calendar,
  Building,
  Heart,
  User,
  Settings,
  Bell,
  Gem,
  Headphones,
  SlidersHorizontal,
  Box,
} from "lucide-react";
import {
  getPublicFeePlans,
  submitCatalogInquiry,
  type CatalogTenant,
  type CatalogFeePlan,
} from "@/services/finance";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";

function useShareLink() {
  const share = React.useCallback(async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  }, []);
  return share;
}

const MOCK_EVENTS = [
  {
    id: "evt-1",
    name: "Annual Showcase & Dance Gala",
    description: "Experience a breathtaking performance of classical dance, modern choreographies, and live musical accompaniment by our top students.",
    date: "Dec 12, 2026 • 6:00 PM onwards",
    location: "Main Auditorium, 1Grow",
    price: 500,
    currency: "INR",
    type: "Gala & Shows",
    feeType: "Ticket Price",
    totalAmount: 500,
    features: [
      { label: "Premium seating zones", included: true },
      { label: "Complimentary brochure & student profile book", included: true },
      { label: "Refreshments & food stalls access", included: false }
    ]
  },
  {
    id: "evt-2",
    name: "Summer Acting & Theater Boot Camp",
    description: "A 10-day intensive course focusing on stage presence, scriptwriting, voice modulation, and physical theater directed by national award winners.",
    date: "May 10 - May 20, 2026",
    location: "Rehearsal Space B",
    price: 3500,
    currency: "INR",
    type: "Workshops",
    feeType: "Full Program Fee",
    totalAmount: 3500,
    features: [
      { label: "Certificate signed by director panel", included: true },
      { label: "All scripts, props & materials provided", included: true },
      { label: "Live staged showcase on final day", included: true }
    ]
  },
  {
    id: "evt-3",
    name: "Creative Writing & Poetry Seminar",
    description: "Refine your storytelling skills and express your thoughts clearly with peer reviews, professional mentorship sessions, and publishing guides.",
    date: "Oct 05, 2026 • 10:00 AM",
    location: "Studio Room A",
    price: 1200,
    currency: "INR",
    type: "Seminars",
    feeType: "Registration Fee",
    totalAmount: 1200,
    features: [
      { label: "Direct publication feedback", included: true },
      { label: "One-on-one portfolio review session", included: true },
      { label: "Lunch and course materials provided", included: true }
    ]
  }
];

const MOCK_RENTALS = [
  {
    id: "rent-1",
    name: "Sony FX3 Cinema Camera",
    description: "Compact, full-frame cinema camera perfect for solo shooters. Shoots 4K at 120fps with incredible low-light performance.",
    price: 3500,
    currency: "INR",
    type: "Cameras",
    feeType: "Daily Rental",
    totalAmount: 3500,
    stock: 5,
    duration: "Per Day",
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800",
      "https://images.unsplash.com/photo-1589802821216-56c46647201b?w=800"
    ],
    images360: Array.from({ length: 36 }).map((_, i) => `https://scaleflex.cloudimg.io/v7/demo/suv-orange/suv-orange-${i + 1}.jpg`),
    features: [
      { label: "4K 120p Recording", included: true },
      { label: "15+ Stops Dynamic Range", included: true },
      { label: "2x 160GB CFexpress Type A included", included: true }
    ]
  },
  {
    id: "rent-2",
    name: "Premium Bridal Lehenga",
    description: "Exquisite hand-embroidered bridal lehenga in deep crimson. Features intricate zari work and comes with a matching dupatta.",
    price: 8500,
    currency: "INR",
    type: "Dresses",
    feeType: "Daily Rental",
    totalAmount: 8500,
    stock: 2,
    duration: "Per Day",
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800",
      "https://images.unsplash.com/photo-1610030469983-98e550d61dc0?w=800",
      "https://images.unsplash.com/photo-1583391733958-d25e07fac666?w=800"
    ],
    features: [
      { label: "Custom fitting adjustments included", included: true },
      { label: "Dry cleaning pre & post rental", included: true },
      { label: "Matching jewelry set", included: false }
    ]
  },
  {
    id: "rent-3",
    name: "Vintage Interactive Photo Booth",
    description: "Bring life to any party with this retro-styled interactive photo booth. Instantly prints strips and allows digital social sharing.",
    price: 12000,
    currency: "INR",
    type: "Party Products",
    feeType: "Per Event",
    totalAmount: 12000,
    stock: 1,
    duration: "6 Hours",
    images: [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800"
    ],
    features: [
      { label: "Unlimited Instant Prints", included: true },
      { label: "Fun prop box included", included: true },
      { label: "On-site attendant", included: true }
    ]
  },
  {
    id: "rent-4",
    name: "Classic Black Tuxedo",
    description: "A sharp, classic black tuxedo tailored for elegance. Perfect for weddings, galas, and formal evening events.",
    price: 2500,
    currency: "INR",
    type: "Dresses",
    feeType: "Daily Rental",
    totalAmount: 2500,
    stock: 8,
    duration: "Per Day",
    images: [
      "https://images.unsplash.com/photo-1594938298596-70f56fb3cecb?w=800",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800",
      "https://images.unsplash.com/photo-1603578761183-f273b313ef0d?w=800"
    ],
    features: [
      { label: "Includes blazer, trousers, and bow tie", included: true },
      { label: "Free alteration check", included: true },
      { label: "Cufflinks included", included: false }
    ]
  },
  {
    id: "rent-5",
    name: "Outdoor Event Canopy (20x20)",
    description: "Heavy-duty waterproof canopy tent ideal for outdoor exhibitions, catering setups, or garden parties. Seats up to 40 people.",
    price: 6000,
    currency: "INR",
    type: "Event Products",
    feeType: "Daily Rental",
    totalAmount: 6000,
    stock: 3,
    duration: "Per Day",
    images: [
      "https://images.unsplash.com/photo-1533174000255-598d7507aa22?w=800",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
      "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800"
    ],
    features: [
      { label: "Setup & Dismantling included", included: true },
      { label: "Waterproof & UV resistant material", included: true },
      { label: "Side-wall attachments", included: false }
    ]
  },
  {
    id: "rent-6",
    name: "Pro PA Audio System",
    description: "High-fidelity public address system with dual 1000W active speakers, a 6-channel mixer, and wireless microphones.",
    price: 5500,
    currency: "INR",
    type: "Party Products",
    feeType: "Daily Rental",
    totalAmount: 5500,
    stock: 2,
    duration: "Per Day",
    images: [
      "https://images.unsplash.com/photo-1520110120835-c96534a4c984?w=800",
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800",
      "https://images.unsplash.com/photo-1470229722913-7c090be5bc65?w=800"
    ],
    features: [
      { label: "Dual 1000W Active Speakers", included: true },
      { label: "2x Wireless UHF Microphones", included: true },
      { label: "Bluetooth Audio Streaming", included: true }
    ]
  }
];

const ImageCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  return (
    <div className="relative w-full h-full group/carousel">
      <img
        src={images[currentIndex]}
        alt="Product"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800'; }}
      />
      {images.length > 1 && (
        <>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
            {images.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
            ))}
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-black/60 z-20"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev - 1 + 2);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-all hover:bg-black/60 z-20"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}
    </div>
  );
};
const Product360Viewer = ({ images, itemName }: { images: string[], itemName: string }) => {
  const [index, setIndex] = React.useState(0);
  const startDragIndex = React.useRef(0);
  const is360 = images && images.length > 5;

  const handleDragStart = () => {
    if (!is360) return;
    startDragIndex.current = index;
  };

  const handleDrag = (e: any, info: any) => {
    if (!is360) return;
    const sensitivity = 20; // pixels per frame
    let delta = Math.floor(info.offset.x / sensitivity);
    
    let newIndex = (startDragIndex.current - delta) % images.length;
    if (newIndex < 0) newIndex += images.length;
    
    setIndex(newIndex);
  };

  if (!images || images.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-white/50 text-sm">No 360 view available for {itemName}.</p>
      </div>
    );
  }

  if (!is360) {
    return (
      <div className="relative w-full h-full bg-[#050505] flex flex-col">
        <ImageCarousel images={images} />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 pointer-events-none bg-white shadow-xl px-5 py-2.5 rounded-full border border-slate-200">
          <Box size={14} className="text-purple-600" />
          <span className="text-slate-900 text-[11px] font-black uppercase tracking-wider">Standard View</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center bg-[#050505]">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        className="absolute inset-0 z-10"
      />
      <img
        src={images[index]}
        alt="360 view"
        className="w-full h-full object-contain pointer-events-none select-none"
      />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 pointer-events-none bg-white shadow-xl px-5 py-2.5 rounded-full border border-slate-200">
        <Box size={14} className="text-purple-600" />
        <span className="text-slate-900 text-[11px] font-black uppercase tracking-wider">Drag to rotate</span>
      </div>
    </div>
  );
};

const View360ModalContent = ({ 
  view360Item, setView360Item, handle360BookingSubmit, submitted, bookingDate, 
  setBookingDate, quantity, setQuantity, name, setName, nameErr, setNameErr, 
  phone, setPhone, phoneErr, setPhoneErr, message, setMessage, submitting 
}: any) => {
  const [showBooking, setShowBooking] = React.useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative w-full max-w-6xl aspect-video rounded-[32px] bg-[#0a0a0a] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-row pointer-events-auto"
    >
      {/* Global Close Button */}
      <button
        onClick={(e) => { e.stopPropagation(); setView360Item(null); }}
        className="absolute top-6 right-6 z-[70] rounded-full p-3 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 shadow-2xl flex items-center justify-center cursor-pointer"
        title="Close"
      >
        <X size={20} />
      </button>

      {/* Left: 360 Viewer */}
      <div className={`relative bg-[#050505] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${showBooking ? 'w-[calc(100%-420px)] border-r border-white/10' : 'w-full'}`}>
        <Product360Viewer 
          images={view360Item.images360 || view360Item.images || []} 
          itemName={view360Item.name} 
        />
        
        {/* Book Now Overlay Button */}
        {/* {!showBooking && (
          <div className="absolute bottom-10 right-10 z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowBooking(true); }}
              className="px-8 py-4 rounded-2xl bg-white text-black font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-2 cursor-pointer"
            >
              <Calendar size={18} />
              Book This Item
            </button>
          </div>
        )} */}
      </div>
      
      {/* Right: Booking Panel */}
      <div className={`bg-[#0d0d0d] flex flex-col relative z-20 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] shrink-0 ${showBooking ? 'w-[420px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-10'}`}>
        <div className="w-[420px] flex flex-col h-full overflow-hidden">
          <div className="p-8 border-b border-white/5 shrink-0 pt-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-400 border border-purple-500/20 mb-4">
              <Gem size={10} /> {view360Item.type || "Premium Rental"}
            </span>
            <h3 className="text-3xl font-black text-white leading-tight tracking-tight">{view360Item.name}</h3>
            <p className="text-white/40 text-sm mt-3 leading-relaxed line-clamp-3">{view360Item.description}</p>
          </div>
          
          <div className="p-8 flex-1 overflow-y-auto">
            {submitted ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                 <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                   <CheckCircle2 size={32} className="text-emerald-500" />
                 </div>
                 <h4 className="text-white font-black text-xl">Booking Requested!</h4>
                 <p className="text-white/50 text-sm leading-relaxed max-w-[250px]">
                   We have received your booking request for <strong>{view360Item.name}</strong>. Our team will contact you shortly to confirm dates.
                 </p>
                 <button 
                   onClick={(e) => { e.stopPropagation(); setView360Item(null); }}
                   className="mt-4 px-8 py-3 rounded-xl bg-white text-black font-black text-sm hover:opacity-90 transition-opacity cursor-pointer"
                 >
                   Close Window
                 </button>
               </div>
            ) : (
               <form className="space-y-5" onSubmit={handle360BookingSubmit}>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-white/50 text-[11px] font-black uppercase tracking-wider mb-2 block">Booking Date <span className="text-red-400">*</span></label>
                     <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors [color-scheme:dark]" />
                   </div>
                   <div>
                     <label className="text-white/50 text-[11px] font-black uppercase tracking-wider mb-2 block">Quantity <span className="text-red-400">*</span></label>
                     <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors" />
                   </div>
                 </div>

                 <div>
                   <label className="text-white/50 text-[11px] font-black uppercase tracking-wider mb-2 block">Your Name <span className="text-red-400">*</span></label>
                   <input type="text" value={name} onChange={e => {setName(e.target.value); setNameErr("");}} required placeholder="Enter full name" className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-white/20 ${nameErr ? 'border-red-500/50 focus:border-red-500' : 'border-white/10'}`} />
                   {nameErr && <p className="text-red-400 text-[10px] font-bold mt-1.5">{nameErr}</p>}
                 </div>

                 <div>
                   <label className="text-white/50 text-[11px] font-black uppercase tracking-wider mb-2 block">Phone Number <span className="text-red-400">*</span></label>
                   <input type="tel" value={phone} onChange={e => {setPhone(e.target.value); setPhoneErr("");}} required placeholder="Enter phone number" className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-white/20 ${phoneErr ? 'border-red-500/50 focus:border-red-500' : 'border-white/10'}`} />
                   {phoneErr && <p className="text-red-400 text-[10px] font-bold mt-1.5">{phoneErr}</p>}
                 </div>

                 <div>
                   <label className="text-white/50 text-[11px] font-black uppercase tracking-wider mb-2 block">Additional Details</label>
                   <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Any specific requirements..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-white/20 resize-none" />
                 </div>

                 <div className="pt-4">
                   <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer">
                     {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                     <span>Request Booking Now</span>
                   </button>
                 </div>
               </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function CatalogClassPage() {
  const params = useParams();
  const slug = params.organisationSlug as string;
  const user = useAuthStore((s) => s.user);
  const share = useShareLink();

  const [tenant, setTenant] = React.useState<CatalogTenant | null>(null);
  const [feePlans, setFeePlans] = React.useState<CatalogFeePlan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [inquiryPlan, setInquiryPlan] = React.useState<any | null>(null);
  const [view360Item, setView360Item] = React.useState<any | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState<"classes" | "events" | "rentals" | "favourites" | "profile">("rentals");
  const [favourites, setFavourites] = React.useState<any[]>([]);

  const availableTabs = React.useMemo(() => {
    if (!tenant) return [];
    const rawInd = tenant.industry || [];
    const inds = (Array.isArray(rawInd) ? rawInd : [rawInd as unknown as string]).map(i => i.toUpperCase());
    const tabs = [];
    if (inds.includes("TRAINING")) {
      tabs.push({ id: "classes", label: "Programs", icon: GraduationCap });
    } else if (inds.includes("RENTAL")) {
      tabs.push({ id: "rentals", label: "Rentals", icon: Building });
    } else if (inds.includes("EVENT")) {
      tabs.push({ id: "events", label: "Events", icon: Calendar });
    } else {
      tabs.push({ id: "rentals", label: "Rentals", icon: Building });
      tabs.push({ id: "classes", label: "Programs", icon: GraduationCap });
      tabs.push({ id: "events", label: "Events", icon: Calendar });
    }
    return tabs;
  }, [tenant]);

  const toggleFavourite = (item: any) => {
    setFavourites(prev => {
      if (prev.some(f => f.id === item.id)) {
        toast.success("Removed from Favourites");
        return prev.filter(f => f.id !== item.id);
      }
      toast.success("Added to Favourites!");
      return [...prev, item];
    });
  };

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFeeType, setSelectedFeeType] = React.useState<string>("ALL");

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [bookingDate, setBookingDate] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);

  const [nameErr, setNameErr] = React.useState("");
  const [phoneErr, setPhoneErr] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getPublicFeePlans(slug);
        if (!cancelled) {
          setTenant(res.data.tenant);
          setFeePlans(res.data.feePlans);
          const rawInd = res.data.tenant.industry || [];
          const inds = (Array.isArray(rawInd) ? rawInd : [rawInd as unknown as string]).map((i: string) => i.toUpperCase());
          if (inds.includes("TRAINING")) {
            setActiveTab("classes");
          } else if (inds.includes("RENTAL")) {
            setActiveTab("rentals");
          } else if (inds.includes("EVENT")) {
            setActiveTab("events");
          } else {
            setActiveTab("classes");
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Something went wrong";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const openInquiry = (plan: any) => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setEmail(user?.email || "");
    setMessage("");
    setNameErr("");
    setPhoneErr("");
    setSubmitted(false);
    setInquiryPlan(plan);
  };

  const validate = (): boolean => {
    let ok = true;
    if (!name.trim()) {
      setNameErr("Name is required");
      ok = false;
    } else {
      setNameErr("");
    }
    if (!phone.trim()) {
      setPhoneErr("Phone number is required");
      ok = false;
    } else if (phone.trim().length < 6) {
      setPhoneErr("Enter a valid phone number");
      ok = false;
    } else {
      setPhoneErr("");
    }
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !inquiryPlan) return;
    setSubmitting(true);
    try {
      const planId = inquiryPlan === "general" ? "general" : inquiryPlan.id;
      
      let finalMessage = message.trim();
      if (String(planId).startsWith("rent-")) {
        const extraInfo = [];
        if (bookingDate) extraInfo.push(`Booking Date: ${bookingDate}`);
        if (quantity) extraInfo.push(`Quantity Required: ${quantity}`);
        if (extraInfo.length > 0) {
          finalMessage = finalMessage 
            ? `${finalMessage}\n\n${extraInfo.join("\n")}` 
            : extraInfo.join("\n");
        }
      }

      await submitCatalogInquiry(slug, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        feePlanId: planId,
        message: finalMessage || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handle360BookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !view360Item) return;
    setSubmitting(true);
    try {
      let finalMessage = message.trim();
      const extraInfo = [];
      if (bookingDate) extraInfo.push(`Booking Date: ${bookingDate}`);
      if (quantity) extraInfo.push(`Quantity Required: ${quantity}`);
      if (extraInfo.length > 0) {
        finalMessage = finalMessage 
          ? `${finalMessage}\n\n${extraInfo.join("\n")}` 
          : extraInfo.join("\n");
      }

      await submitCatalogInquiry(slug, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        feePlanId: view360Item.id,
        message: finalMessage || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    share(url, `Check out ${tenant?.name || "our catalog"}`);
  };

  const fmt = (amount: number, currency: string) =>
    currency === "INR"
      ? `\u20B9${amount.toLocaleString("en-IN")}`
      : `${currency} ${amount.toLocaleString()}`;

  const feeLabel = (type: string) =>
    ({ ONE_TIME: "One-time", MONTHLY: "Monthly", QUARTERLY: "Quarterly", TERM: "Term", YEARLY: "Yearly" }[type] || type);

  const brandColor = tenant?.brand?.primaryColor || "#6366f1";

  const filteredPlans = React.useMemo(() => {
    return feePlans.filter((plan) => {
      const matchesSearch =
        searchQuery === "" ||
        plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plan.description && plan.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (plan.course?.name && plan.course.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFeeType =
        selectedFeeType === "ALL" || plan.feeType === selectedFeeType;

      return matchesSearch && matchesFeeType;
    });
  }, [feePlans, searchQuery, selectedFeeType]);

  const availableFeeTypes = React.useMemo(() => {
    const types = Array.from(new Set(feePlans.map((p) => p.feeType)));
    return ["ALL", ...types];
  }, [feePlans]);

  const filteredEvents = React.useMemo(() => {
    return MOCK_EVENTS.filter((evt) => {
      return searchQuery === "" ||
        evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.type.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery]);

  const filteredRentals = React.useMemo(() => {
    return MOCK_RENTALS.filter((rent) => {
      return searchQuery === "" ||
        rent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        // rent.capacity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rent.type.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={36} className="mx-auto animate-spin text-purple-600" style={{ color: brandColor }} />
          <p className="text-slate-500 text-sm">Loading catalog details...</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
          <p className="text-slate-500 text-sm leading-relaxed">{error || "Institution not found or no public plans available."}</p>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-semibold text-slate-900 transition-all hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            Go Home <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* ── Left Sidebar (hidden on small/medium screens for simplicity, visible on lg) ── */}
      <aside className="w-full lg:w-[280px] bg-[#0b0c13] border-b lg:border-b-0 lg:border-r border-[#1a1b2b] flex flex-col p-6 shrink-0 z-20">
        
        {/* Logo and Org Name */}
        <div className="flex items-center gap-3.5 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr p-[2px] shrink-0" style={{ backgroundImage: `linear-gradient(135deg, ${brandColor}, ${tenant.brand?.secondaryColor || brandColor})` }}>
            <div className="h-full w-full rounded-[14px] bg-[#0c0d14] overflow-hidden flex items-center justify-center">
              {tenant.logoUrl ? (
                <img src={tenant.logoUrl} alt={tenant.name} className="h-full w-full object-cover bg-white" />
              ) : (
                <GraduationCap size={22} style={{ color: brandColor }} />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-white truncate tracking-tight">{tenant.name}</h2>
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            </div>
            <span className="inline-flex mt-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
              {(Array.isArray(tenant.industry) ? tenant.industry : [tenant.industry]).filter(Boolean).join(" · ") || "RENTAL"}
            </span>
          </div>
        </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Share2 size={13} className="text-slate-500" />
              <span>Share</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("favourites");
                setSearchQuery("");
                setSelectedFeeType("ALL");
              }}
              className={`p-2 rounded-xl border transition-all ${activeTab === 'favourites' ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <Heart size={16} className={favourites.length > 0 ? "text-red-500 fill-red-500" : ""} />
            </button>
            <button
              onClick={() => {
                setActiveTab("profile");
                setSearchQuery("");
                setSelectedFeeType("ALL");
              }}
              className={`p-2 rounded-xl border transition-all ${activeTab === 'profile' ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <User size={16} />
            </button>
          </div>
        </aside>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
          
          {/* ── Premium Hero Banner ── */}
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white shadow-2xl">
            {/* Ambient Background Lights */}
            <div className="absolute top-[-50%] left-[-20%] w-[60%] h-[120%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-50%] right-[-10%] w-[50%] h-[100%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#15162a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 sm:p-10 lg:p-12 relative z-10">
              {/* Left Column Text */}
              <div className="lg:col-span-6 space-y-6">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#a855f7] block" style={{ color: brandColor }}>
                  {activeTab === "classes" ? "PREMIUM PROGRAMS" : activeTab === "events" ? "PREMIUM EVENTS" : "PREMIUM VENUES"}
                </span>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.15] tracking-tight">
                  {activeTab === "classes" ? (
                    <>Unlock your potential with <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-[#a855f7] bg-clip-text text-transparent">expert programs.</span></>
                  ) : activeTab === "events" ? (
                    <>Extraordinary events for <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-[#a855f7] bg-clip-text text-transparent">lifelong memories.</span></>
                  ) : (
                    <>Extraordinary spaces for <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-[#a855f7] bg-clip-text text-transparent">unforgettable moments.</span></>
                  )}
                </h1>

                <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                  {activeTab === "classes"
                    ? "Curated curriculum. Experienced instructors. Flexible schedules tailored to match your pace."
                    : activeTab === "events"
                      ? "Handpicked workshops, showcases, and seminars. Book tickets easily. Enjoy premium access."
                      : "Handpicked premium venues. Seamless booking. Memorable experiences guaranteed."}
                </p>

                {/* Pill features */}
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {[
                    { label: "Premium Venues", icon: Gem },
                    { label: "Modern Facilities", icon: Building },
                    { label: "Trusted Partner", icon: ShieldCheck },
                    { label: "End-to-End Support", icon: Headphones }
                  ].map((feat, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600"
                    >
                      <feat.icon size={12} className="text-purple-600" style={{ color: brandColor }} />
                      {feat.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right Column Image */}
              <div className="lg:col-span-6 relative flex justify-end">
                <div className="relative w-full max-w-[500px] rounded-[24px] overflow-hidden border border-slate-200 shadow-2xl group flex items-center justify-center bg-slate-50">
                  <img 
                    src={tenant.coverImageUrl || "/images/premium_venue_banner.png"} 
                    alt={tenant.name || "Premium Venue"} 
                    className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 z-10 pointer-events-none" />

                  {/* Top Right custom badge on the card */}
                  <div className="absolute top-4 right-4 z-20">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-xl px-3 py-1 text-[10px] font-semibold text-slate-900 border border-white/10">
                      <ShieldCheck size={11} className="text-slate-900/80" />
                      Verified Partner
                    </span>
                  </div>

                  {/* Overlaid Admissions Open Card in the image */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-[#22c55e]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                        ADMISSIONS OPEN
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                        {activeTab === "classes" 
                          ? "Enrol now to secure your seat for this term!" 
                          : activeTab === "events"
                            ? "Register early and lock in early-bird prices!"
                            : "Book your space now for upcoming events!"}
                      </p>
                    </div>
                    {/* <button 
                      onClick={() => {
                        const el = document.getElementById("catalog-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-slate-900 shrink-0 shadow-lg transition-transform hover:scale-105 active:scale-95"
                      style={{ backgroundColor: brandColor }}
                    >
                      <ArrowRight size={16} />
                    </button> */}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Catalog Tab Pill & Search & Filters */}
          <section id="catalog-section" className="space-y-6">
            
            {/* Tabs & Search controls in a unified design */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
                            {/* Tab capsules */}
              <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200 self-start shadow-sm">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setSearchQuery("");
                        setSelectedFeeType("ALL");
                      }}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 ${
                        active
                          ? "bg-slate-100 text-slate-900 shadow-sm scale-[1.02] border border-slate-200"
                          : "text-slate-500 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      <Icon size={14} style={active ? { color: brandColor } : undefined} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Filters / Search Pill */}
              <div className="flex items-center gap-3 flex-1 md:max-w-md">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === "classes"
                        ? "Search programs or subjects..."
                        : activeTab === "events"
                          ? "Search events or workshops..."
                          : "Search rental venues or facilities..."
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-purple-600 transition-all"
                    style={{ focusBorderColor: brandColor } as React.CSSProperties}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {activeTab === "classes" && availableFeeTypes.length > 2 && (
                  <div className="relative">
                    <select
                      value={selectedFeeType}
                      onChange={(e) => setSelectedFeeType(e.target.value)}
                      className="appearance-none bg-white border border-slate-200 text-xs font-bold text-slate-600 pl-4 pr-10 py-2.5 rounded-2xl focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      {availableFeeTypes.map((type) => (
                        <option key={type} value={type} className="bg-white text-slate-900">
                          {type === "ALL" ? "All Types" : feeLabel(type)}
                        </option>
                      ))}
                    </select>
                    <SlidersHorizontal size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>

            {/* Content Lists */}
            {activeTab === "classes" && (
              feePlans.length === 0 ? (
                <div className="text-center py-20 space-y-3 bg-white rounded-3xl border border-slate-200">
                  <GraduationCap size={44} className="mx-auto text-slate-600" />
                  <h3 className="text-base font-bold text-slate-900">No Programs Available</h3>
                  <p className="text-slate-500 text-xs">Check back later for new offerings.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredPlans.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
                      <Search size={32} className="mx-auto text-slate-600" />
                      <h3 className="text-sm font-bold text-slate-900">No matching programs found</h3>
                      <p className="text-xs text-slate-500">Try adjusting your search query or filter settings.</p>
                      <button
                        onClick={() => { setSearchQuery(""); setSelectedFeeType("ALL"); }}
                        className="text-xs font-black underline text-purple-600"
                        style={{ color: brandColor }}
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    <motion.div 
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
                      }}
                      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {filteredPlans.map((plan) => (
                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 15 },
                            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                          }}
                          key={plan.id}
                          className="group relative flex flex-col rounded-[24px] border border-slate-200 bg-white/90 backdrop-blur-xl overflow-hidden hover:border-slate-300 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-2xl"
                        >
                          {/* Image Box */}
                          <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 border-b border-slate-200">
                            <img 
                              src="/images/grand_theater_hall.png" 
                              alt={plan.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            
                            {/* Class/Course Badge */}
                            <span 
                              className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-xl bg-white/90 backdrop-blur-md px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-600 border border-[#a78bfa]/20"
                              style={{ color: brandColor, borderColor: `${brandColor}40` }}
                            >
                              <GraduationCap size={10} />
                              {plan.course?.name || "Course"}
                            </span>

                            {/* Favorite Heart trigger */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleFavourite(plan); }}
                              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/80 backdrop-blur-md border border-white/10 hover:bg-white flex items-center justify-center text-slate-900 transition-all active:scale-90"
                            >
                              <Heart size={14} className={favourites.some(f => f.id === plan.id) ? "text-red-500 fill-red-500" : "text-slate-600 hover:text-red-500 hover:fill-red-500 transition-colors"} />
                            </button>
                          </div>

                          <div className="flex flex-col flex-1 p-5 space-y-4">
                            <div>
                              <h3 className="text-base font-black text-slate-900 group-hover:text-purple-600 transition-colors" style={{ groupHoverColor: brandColor } as any}>{plan.name}</h3>
                              {plan.description && (
                                <p className="text-slate-500 mt-1.5 text-xs leading-relaxed line-clamp-2">{plan.description}</p>
                              )}
                            </div>

                            {/* Features */}
                            {Array.isArray(plan.features) && plan.features.length > 0 && (
                              <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                                {plan.features.slice(0, 3).map((f, i) => (
                                  <li key={i} className="flex items-center gap-2 text-xs">
                                    {f.included ? (
                                      <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                                    ) : (
                                      <X size={13} className="shrink-0 text-slate-600" />
                                    )}
                                    <span className={f.included ? "text-slate-600" : "text-slate-500 line-through"}>
                                      {f.label}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* Price / Action Row */}
                            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                              <div>
                                <span className="text-base font-black text-slate-900" style={{ color: brandColor }}>
                                  {fmt(plan.totalAmount, plan.currency)}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">/ {feeLabel(plan.feeType)}</span>
                              </div>
                              
                              <button
                                onClick={() => openInquiry(plan)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-black text-slate-900 shadow-md transition-all active:scale-95 shrink-0"
                                style={{ backgroundColor: brandColor }}
                              >
                                <span>View Details</span>
                                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )
            )}

            {activeTab === "events" && (
              <div className="space-y-6">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
                    <Search size={32} className="mx-auto text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-900">No matching events found</h3>
                    <p className="text-xs text-slate-500">Try adjusting your search query.</p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs font-black underline text-purple-600"
                      style={{ color: brandColor }}
                    >
                      Reset search
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.08 } }
                    }}
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {filteredEvents.map((evt) => (
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 15 },
                          show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                        }}
                        key={evt.id}
                        className="group relative flex flex-col rounded-[24px] border border-slate-200 bg-white/90 backdrop-blur-xl overflow-hidden hover:border-slate-300 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-2xl"
                      >
                        {/* Image Box */}
                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 border-b border-slate-200">
                          <img 
                            src={evt.id === "evt-1" ? "/images/grand_theater_hall.png" : evt.id === "evt-2" ? "/images/acoustic_dance_studio.png" : "/images/seminar_hall.png"} 
                            alt={evt.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          
                          {/* Event Category Badge */}
                          <span 
                            className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-xl bg-white/90 backdrop-blur-md px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-600 border border-[#a78bfa]/20"
                            style={{ color: brandColor, borderColor: `${brandColor}40` }}
                          >
                            <Calendar size={10} />
                            {evt.type}
                          </span>

                          {/* Favorite Heart trigger */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleFavourite(evt); }}
                            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/80 backdrop-blur-md border border-white/10 hover:bg-white flex items-center justify-center text-slate-900 transition-all active:scale-90"
                          >
                            <Heart size={14} className={favourites.some(f => f.id === evt.id) ? "text-red-500 fill-red-500" : "text-slate-600 hover:text-red-500 hover:fill-red-500 transition-colors"} />
                          </button>
                        </div>

                        <div className="flex flex-col flex-1 p-5 space-y-4">
                          <div>
                            <h3 className="text-base font-black text-slate-900 group-hover:text-purple-600 transition-colors" style={{ groupHoverColor: brandColor } as any}>{evt.name}</h3>
                            <p className="text-slate-500 mt-1.5 text-xs leading-relaxed line-clamp-2">{evt.description}</p>
                          </div>

                          {/* Event Date & Location info */}
                          <div className="mt-2 space-y-2 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-2">
                              <Clock size={12} className="text-slate-500 shrink-0" />
                              <span>{evt.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-slate-500 shrink-0" />
                              <span className="truncate">{evt.location}</span>
                            </div>
                          </div>

                          {/* Price / Action Row */}
                          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-base font-black text-slate-900" style={{ color: brandColor }}>
                                {fmt(evt.price, evt.currency)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold block mt-0.5">/ {evt.feeType}</span>
                            </div>
                            
                            <button
                              onClick={() => openInquiry(evt)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-black text-slate-900 shadow-md transition-all active:scale-95 shrink-0"
                              style={{ backgroundColor: brandColor }}
                            >
                              <span>View Details</span>
                              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === "rentals" && (
              <div className="space-y-6">
                {filteredRentals.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
                    <Search size={32} className="mx-auto text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-900">No matching spaces found</h3>
                    <p className="text-xs text-slate-500">Try adjusting your search query.</p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs font-black underline text-purple-600"
                      style={{ color: brandColor }}
                    >
                      Reset search
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.08 } }
                    }}
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {filteredRentals.map((rent) => (
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 15 },
                          show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                        }}
                        key={rent.id}
                        className="group relative flex flex-col rounded-[24px] border border-slate-200 bg-white/90 backdrop-blur-xl overflow-hidden hover:border-slate-300 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-2xl"
                      >
                        {/* Image Box */}
                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 border-b border-slate-200">
                          <ImageCarousel images={rent.images || ["/images/camera.png"]} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                          
                          {/* 360 View Button */}
                          <button 
                            onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               setView360Item(rent);
                            }}
                            className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/40 flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 z-30"
                            title="360° View"
                          >
                            <Box size={20} />
                          </button>
                          
                          {/* Rental category badge */}
                          <span 
                            className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-xl bg-white/90 backdrop-blur-md px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-600 border border-[#a78bfa]/20"
                            style={{ color: brandColor, borderColor: `${brandColor}40` }}
                          >
                            <Building size={10} />
                            {rent.type}
                          </span>

                          {/* Favorite Heart trigger */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleFavourite(rent); }}
                            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/80 backdrop-blur-md border border-white/10 hover:bg-white flex items-center justify-center text-slate-900 transition-all active:scale-90"
                          >
                            <Heart size={14} className={favourites.some(f => f.id === rent.id) ? "text-red-500 fill-red-500" : "text-slate-600 hover:text-red-500 hover:fill-red-500 transition-colors"} />
                          </button>
                        </div>

                        <div className="flex flex-col flex-1 p-5 space-y-4">
                          <div>
                            <h3 className="text-base font-black text-slate-900 group-hover:text-purple-600 transition-colors" style={{ groupHoverColor: brandColor } as any}>{rent.name}</h3>
                            <p className="text-slate-500 mt-1.5 text-xs leading-relaxed line-clamp-2">{rent.description}</p>
                          </div>

                          {/* Features */}
                          {Array.isArray(rent.features) && rent.features.length > 0 && (
                            <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                              {rent.features.slice(0, 3).map((f, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs">
                                  {f.included ? (
                                    <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                                  ) : (
                                    <X size={13} className="shrink-0 text-slate-600" />
                                  )}
                                  <span className={f.included ? "text-slate-600" : "text-slate-500 line-through"}>
                                    {f.label}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Rental stock & duration info */}
                          <div className="mt-2 space-y-2 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Box size={12} className="text-slate-500 shrink-0" />
                                <span>In Stock: {rent.stock || 0}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-slate-500 shrink-0" />
                                <span>{rent.duration}</span>
                              </div>
                            </div>
                          </div>

                          {/* Price / Action Row */}
                          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-base font-black text-slate-900" style={{ color: brandColor }}>
                                {fmt(rent.price, rent.currency)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold block mt-0.5">/ {rent.feeType}</span>
                            </div>
                            
                            <button
                              onClick={() => openInquiry(rent)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-black text-slate-900 shadow-md transition-all active:scale-95 shrink-0"
                              style={{ backgroundColor: brandColor }}
                            >
                              <span>View Details</span>
                              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === "favourites" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">My Favourites</h2>
                    <p className="text-sm text-slate-500 mt-1">Your saved venues and programs.</p>
                  </div>
                </div>
                
                {favourites.length === 0 ? (
                  <div className="rounded-[24px] border border-slate-200 bg-white/90 backdrop-blur-xl overflow-hidden shadow-2xl">
                     <div className="p-6 text-center text-slate-500 py-24">
                       <Heart size={44} className="mx-auto mb-4 opacity-40 text-red-500" />
                       <p className="font-bold text-slate-900 text-lg">No Favourites Saved</p>
                       <p className="text-sm mt-1 max-w-sm mx-auto text-slate-500">Click the heart icon on any program or venue card to save it here for quick access later.</p>
                     </div>
                  </div>
                ) : (
                  <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: { opacity: 0 },
                      show: { opacity: 1, transition: { staggerChildren: 0.08 } }
                    }}
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {favourites.map((fav) => (
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: 15 },
                          show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                        }}
                        key={fav.id}
                        className="group relative flex flex-col rounded-[24px] border border-slate-200 bg-white/90 backdrop-blur-xl overflow-hidden hover:border-slate-300 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-2xl"
                      >
                         <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 border-b border-slate-200">
                           <img 
                             src="/images/premium_venue_banner.png" 
                             alt={fav.name} 
                             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                           <button 
                             onClick={(e) => { e.stopPropagation(); toggleFavourite(fav); }}
                             className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/80 backdrop-blur-md border border-white/10 hover:bg-white flex items-center justify-center text-slate-900 transition-all active:scale-90"
                           >
                             <Heart size={14} className="text-red-500 fill-red-500" />
                           </button>
                         </div>
                         <div className="flex flex-col flex-1 p-5 space-y-4">
                            <div>
                              <h3 className="text-base font-black text-slate-900">{fav.name}</h3>
                              {(fav.description || fav.course?.name) && <p className="text-slate-500 mt-1.5 text-xs line-clamp-2">{fav.description || fav.course?.name}</p>}
                            </div>
                            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                              <div>
                                <span className="text-base font-black text-slate-900" style={{ color: brandColor }}>
                                  {fmt(fav.totalAmount || fav.price || 0, fav.currency || "INR")}
                                </span>
                              </div>
                              <button
                                onClick={() => openInquiry(fav)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-black text-slate-900 shadow-md transition-all active:scale-95 shrink-0"
                                style={{ backgroundColor: brandColor }}
                              >
                                <span>View Details</span>
                                <ArrowRight size={12} />
                              </button>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === "profile" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">My Profile</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage your account details and preferences.</p>
                  </div>
                </div>
                
                <div className="rounded-[24px] border border-slate-200 bg-white/90 backdrop-blur-xl p-8 shadow-2xl max-w-3xl">
                   <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-200">
                     <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-emerald-400 to-[#10b981] p-1 shadow-lg shrink-0">
                       <div className="h-full w-full rounded-[14px] bg-[#0d0e15] flex items-center justify-center overflow-hidden">
                         <User size={32} className="text-emerald-600" />
                       </div>
                     </div>
                     <div>
                       <h3 className="text-2xl font-black text-slate-900">{user ? user.name : "Guest User"}</h3>
                       <p className="text-sm text-slate-500 mt-1">{user ? user.email : "guest@example.com"}</p>
                       <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600">
                         <CheckCircle2 size={12} /> {user ? user.role : "Account Verified"}
                       </div>
                     </div>
                   </div>
                   
                   <div className="space-y-6 opacity-75 pointer-events-none select-none">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="text-xs font-bold text-slate-500 mb-2 block">First Name</label>
                         <input type="text" readOnly value={user ? user.name.split(" ")[0] : "Guest"} className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none" />
                       </div>
                       <div>
                         <label className="text-xs font-bold text-slate-500 mb-2 block">Last Name</label>
                         <input type="text" readOnly value={user ? (user.name.split(" ").slice(1).join(" ") || "-") : "User"} className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none" />
                       </div>
                       <div>
                         <label className="text-xs font-bold text-slate-500 mb-2 block">Email Address</label>
                         <input type="email" readOnly value={user ? user.email : "guest@example.com"} className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 text-sm focus:outline-none" />
                       </div>
                       <div>
                         <label className="text-xs font-bold text-slate-500 mb-2 block">Phone Number</label>
                         <input type="tel" readOnly value={user && user.phone ? user.phone : "+91 98765 43210"} className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none" />
                       </div>
                     </div>
                   </div>
                </div>
              </motion.div>
            )}

          </section>

        </div>

        {/* ── Contact & Footer ── */}
        <footer className="border-t border-slate-200 bg-white/90 py-12 px-6 mt-auto">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {tenant.logoUrl ? (
                <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 rounded-lg object-cover bg-white" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <GraduationCap size={16} />
                </div>
              )}
              <span className="text-sm font-bold text-slate-500">&copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.</span>
            </div>
            
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
              Powered by{" "}
              <Link href="/" className="text-slate-600 font-bold hover:text-slate-900 transition-colors">
                1Grow
              </Link>
            </p>
          </div>
        </footer>

      {/* ── Inquiry Modal ── */}
      <AnimatePresence>
        {inquiryPlan && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" 
              onClick={() => !submitting && setInquiryPlan(null)} 
            />
            <div className="fixed inset-x-0 bottom-0 z-50 sm:fixed sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
              <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-lg rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl sm:rounded-2xl sm:border sm:border-slate-200 overflow-hidden max-h-[90vh] flex flex-col text-slate-900"
              >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900">
                    {submitted 
                      ? "Thank You!" 
                      : inquiryPlan === "general"
                        ? "General Enquiry"
                        : String(inquiryPlan.id).startsWith("evt-") 
                          ? "Enquire About Event" 
                          : String(inquiryPlan.id).startsWith("rent-") 
                            ? "Enquire About Rental" 
                            : "Enquire About Plan"}
                  </h3>
                  {!submitted && inquiryPlan !== "general" && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {inquiryPlan.name} &mdash; {fmt(inquiryPlan.totalAmount || inquiryPlan.price || 0, inquiryPlan.currency || "INR")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => !submitting && setInquiryPlan(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 transition-colors shrink-0 ml-3"
                  disabled={submitting}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1">
                {submitted ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">Inquiry Submitted!</h4>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                      <strong>{tenant.name}</strong> will contact you soon regarding your inquiry for{" "}
                      <strong>{inquiryPlan.name}</strong>.
                    </p>
                    <button
                      onClick={() => setInquiryPlan(null)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-slate-900 transition-colors hover:opacity-90"
                      style={{ backgroundColor: brandColor }}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Plan summary */}
                    {inquiryPlan !== "general" && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${brandColor}12` }}>
                          {String(inquiryPlan.id).startsWith("evt-") ? (
                            <Calendar size={18} style={{ color: brandColor }} />
                          ) : String(inquiryPlan.id).startsWith("rent-") ? (
                            <Building size={18} style={{ color: brandColor }} />
                          ) : (
                            <GraduationCap size={18} style={{ color: brandColor }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{inquiryPlan.name}</p>
                          <p className="text-xs text-slate-500">
                            {fmt(inquiryPlan.totalAmount || inquiryPlan.price || 0, inquiryPlan.currency || "INR")} / {
                              String(inquiryPlan.id).startsWith("evt-") || String(inquiryPlan.id).startsWith("rent-") 
                                ? inquiryPlan.feeType || "Fee"
                                : feeLabel(inquiryPlan.feeType || "ONE_TIME")
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Name */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Your Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); if (nameErr) setNameErr(""); }}
                        placeholder="Enter your full name"
                        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors ${
                          nameErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-200 focus:border-purple-600 focus:ring-purple-600"
                        }`}
                        style={!nameErr ? ({ focusBorderColor: brandColor, focusRingColor: brandColor } as any) : undefined}
                      />
                      {nameErr && <p className="mt-1.5 text-xs text-red-500">{nameErr}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); if (phoneErr) setPhoneErr(""); }}
                        placeholder="Enter your contact number"
                        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-colors ${
                          phoneErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-slate-200 focus:border-purple-600 focus:ring-purple-600"
                        }`}
                        style={!phoneErr ? ({ focusBorderColor: brandColor, focusRingColor: brandColor } as any) : undefined}
                      />
                      {phoneErr && <p className="mt-1.5 text-xs text-red-500">{phoneErr}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Email Address <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-purple-600 focus:ring-purple-600 transition-colors"
                        style={{ focusBorderColor: brandColor, focusRingColor: brandColor } as any}
                      />
                    </div>

                    {/* Additional fields for Rental Inquiry */}
                    {inquiryPlan !== "general" && String(inquiryPlan.id).startsWith("rent-") && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600">
                            Booking Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-purple-600 transition-colors"
                            style={{ focusBorderColor: brandColor, focusRingColor: brandColor } as any}
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-slate-600">
                            Quantity Required <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-purple-600 transition-colors"
                            style={{ focusBorderColor: brandColor, focusRingColor: brandColor } as any}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Message */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-600">
                        Special Notes / Message <span className="text-slate-500">(Optional)</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Let us know any specific requirements or questions..."
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-purple-600 focus:ring-purple-600 transition-colors resize-none"
                        style={{ focusBorderColor: brandColor, focusRingColor: brandColor } as any}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-slate-900 transition-all hover:opacity-90 active:scale-[0.98] shadow-lg disabled:opacity-50"
                      style={{ backgroundColor: brandColor }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Submit Enquiry</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      {/* 360 View Modal */}
      <AnimatePresence>
        {view360Item && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md" 
              onClick={() => setView360Item(null)} 
            />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <View360ModalContent
                view360Item={view360Item}
                setView360Item={setView360Item}
                handle360BookingSubmit={handle360BookingSubmit}
                submitted={submitted}
                bookingDate={bookingDate}
                setBookingDate={setBookingDate}
                quantity={quantity}
                setQuantity={setQuantity}
                name={name}
                setName={setName}
                nameErr={nameErr}
                setNameErr={setNameErr}
                phone={phone}
                setPhone={setPhone}
                phoneErr={phoneErr}
                setPhoneErr={setPhoneErr}
                message={message}
                setMessage={setMessage}
                submitting={submitting}
              />
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
