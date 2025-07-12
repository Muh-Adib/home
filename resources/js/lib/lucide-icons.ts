import {
    Wifi,
    Snowflake,
    Car,
    Tv,
    Shirt,
    ChefHat,
    Refrigerator,
    Microwave,
    Coffee,
    Utensils,
    Droplets,
    Wind,
    Sparkles,
    Play,
    Speaker,
    Gamepad2,
    Waves,
    Trees,
    Flame,
    Armchair,
    Umbrella,
    Camera,
    Lock,
    HeartPulse,
    ShieldCheck,
    Building2,
    Ban,
    Droplet,
    Bath,
    ShowerHead,
    Bed,
    Baby,
    CigaretteOff,
    Dog,
    Fan,
    Sun,
    WashingMachine,
    Zap,
    Plug,
    Thermometer,
    Phone,
    Clock,
    Dumbbell,
    CircleDot,
    Briefcase,
    Users,
    Presentation,
    Wine,
    Bell,
    UtensilsCrossed,
    GlassWater,
    Croissant,
    KeyRound,
    User,
    Luggage,
    Bus,
    Bike,
    BookOpen,
    Target,
    ArrowUp,
    Accessibility,
    TrendingUp,
    Home,
    Building,
    Flower,
    Mountain,
    Heart,
    Church,
    Circle,
    Cigarette,
    type LucideIcon
} from 'lucide-react';

/**
 * Mapping dari string icon name ke LucideIcon component
 * Digunakan untuk konversi dari database string ke React component
 */
export const iconMap: Record<string, LucideIcon> = {
    'wifi': Wifi,
    'snowflake': Snowflake,
    'car': Car,
    'tv': Tv,
    'shirt': Shirt,
    'chef-hat': ChefHat,
    'refrigerator': Refrigerator,
    'microwave': Microwave,
    'coffee': Coffee,
    'utensils': Utensils,
    'droplets': Droplets,
    'wind': Wind,
    'soap': Sparkles,
    'play': Play,
    'speaker': Speaker,
    'gamepad-2': Gamepad2,
    'waves': Waves,
    'trees': Trees,
    'flame': Flame,
    'armchair': Armchair,
    'umbrella': Umbrella,
    'camera': Camera,
    'lock': Lock,
    'heart-pulse': HeartPulse,
    'fire-extinguisher': ShieldCheck,
    'first-aid': HeartPulse,
    'bathtub': Bath,
    'shower': ShowerHead,
    'bed': Bed,
    'baby': Baby,
    'no-smoking': CigaretteOff,
    'pet-friendly': Dog,
    'fan': Fan,
    'sunlight': Sun,
    'washer': WashingMachine,
    'dryer': Wind,
    'iron': Flame,
    'charging-port': Zap,
    'power-outlet': Plug,
    'heating': Thermometer,
    'phone': Phone,
    'alarm-clock': Clock,
    'gym': Dumbbell,
    'spa': Sparkles,
    'sauna': Thermometer,
    'hot-tub': Bath,
    'tennis': CircleDot,
    'business-center': Briefcase,
    'meeting-room': Users,
    'conference-room': Presentation,
    'minibar': Wine,
    'room-service': Bell,
    'restaurant': UtensilsCrossed,
    'bar': GlassWater,
    'breakfast': Croissant,
    'vending-machine': Coffee,
    'keycard': KeyRound,
    'concierge': User,
    'luggage-storage': Luggage,
    'laundry-service': Shirt,
    'shuttle': Bus,
    'car-rental': Car,
    'bicycle-rental': Bike,
    'library': BookOpen,
    'game-room': Target,
    'kids-club': Baby,
    'playground': Trees,
    'elevator': ArrowUp,
    'wheelchair-access': Accessibility,
    'ramp': TrendingUp,
    'balcony': Home,
    'terrace': Building,
    'patio': Flower,
    'mountain-view': Mountain,
    'sea-view': Waves,
    'city-view': Building2,
    'honeymoon-suite': Heart,
    'family-room': Users,
    'smoking-area': Cigarette,
    'prayer-room': Church,
    'meditation-room': Circle,
    // Default fallback
    'default': Building2,
};

/**
 * Mendapatkan LucideIcon component dari string icon name
 * @param iconName - Nama icon dari database
 * @returns LucideIcon component
 */
export function getIconByName(iconName: string | null | undefined): LucideIcon {
    if (!iconName || iconName === 'none' || iconName === '') {
        return Building2; // Default icon
    }
    
    return iconMap[iconName] || iconMap['default'];
}

/**
 * Mendapatkan daftar semua icon yang tersedia untuk dropdown/select
 * @returns Array of icon options dengan value, label, dan component
 */
export function getAvailableIcons() {
    return [
       
            { value: 'none', label: '🚫 None', icon: Ban },
            { value: 'wifi', label: '📶 WiFi', icon: Wifi },
            { value: 'ac', label: '❄️ AC', icon: Snowflake },
            { value: 'parking', label: '🚗 Parking', icon: Car },
            { value: 'tv', label: '📺 TV', icon: Tv },
            { value: 'linens', label: '🧺 Linens', icon: Shirt },
            { value: 'kitchen', label: '👨‍🍳 Kitchen', icon: ChefHat },
            { value: 'fridge', label: '🧊 Fridge', icon: Refrigerator },
            { value: 'microwave', label: '📻 Microwave', icon: Microwave },
            { value: 'coffee', label: '☕ Coffee Maker', icon: Coffee },
            { value: 'dining', label: '🍽️ Dining Area', icon: Utensils },
            { value: 'hot-water', label: '🚿 Hot Water', icon: Droplets },
            { value: 'hair-dryer', label: '💨 Hair Dryer', icon: Wind },
            { value: 'toiletries', label: '🧼 Toiletries', icon: Droplet },
            { value: 'streaming', label: '▶️ Streaming', icon: Play },
            { value: 'sound-system', label: '🔊 Sound System', icon: Speaker },
            { value: 'games', label: '🎮 Games Console', icon: Gamepad2 },
            { value: 'pool', label: '🏊 Pool', icon: Waves },
            { value: 'garden', label: '🌳 Garden', icon: Trees },
            { value: 'bbq', label: '🔥 BBQ Grill', icon: Flame },
            { value: 'seating', label: '🪑 Seating', icon: Armchair },
            { value: 'beach', label: '🏖️ Beach Access', icon: Umbrella },
            { value: 'security', label: '📷 Security Camera', icon: Camera },
            { value: 'safe', label: '🔒 Safe Box', icon: Lock },
            { value: 'first-aid', label: '🩹 First Aid Kit', icon: HeartPulse },
            { value: 'fire-safety', label: '🧯 Fire Extinguisher', icon: Flame },
            
            // Amenities Kamar
            { value: 'bathtub', label: '🛁 Bathtub', icon: Bath },
            { value: 'shower', label: '🚿 Shower', icon: ShowerHead },
            { value: 'extra-bed', label: '🛏️ Extra Bed', icon: Bed },
            { value: 'baby-crib', label: '👶 Baby Crib', icon: Baby },
            { value: 'no-smoking', label: '🚭 Non‑Smoking', icon: CigaretteOff },
            { value: 'pet-friendly', label: '🐶 Pet Friendly', icon: Dog },
            { value: 'fan', label: '🌀 Fan', icon: Fan },
            { value: 'sunlight', label: '🌞 Sunlight View', icon: Sun },
            
            // Amenities Elektronik & Utilitas
            { value: 'washer', label: '🧺 Washing Machine', icon: WashingMachine },
            { value: 'dryer', label: '🌪️ Dryer', icon: Wind },
            { value: 'iron', label: '🔥 Iron & Ironing Board', icon: Flame },
            { value: 'charging-port', label: '🔌 Charging Port', icon: Zap },
            { value: 'power-outlet', label: '⚡ Power Outlet', icon: Plug },
            { value: 'heating', label: '🔥 Heating', icon: Thermometer },
            { value: 'phone', label: '📞 Phone', icon: Phone },
            { value: 'alarm-clock', label: '⏰ Alarm Clock', icon: Clock },
            
            // Amenities Fasilitas Umum
            { value: 'gym', label: '🏋️‍♂️ Gym Access', icon: Dumbbell },
            { value: 'spa', label: '💆‍♀️ Spa', icon: Sparkles },
            { value: 'sauna', label: '🧖‍♀️ Sauna', icon: Thermometer },
            { value: 'hot-tub', label: '🛁 Hot Tub', icon: Bath },
            { value: 'tennis', label: '🎾 Tennis Court', icon: CircleDot },
            { value: 'business-center', label: '💼 Business Center', icon: Briefcase },
            { value: 'meeting-room', label: '👥 Meeting Room', icon: Users },
            { value: 'conference-room', label: '📊 Conference Room', icon: Presentation },
            
            // Amenities Makanan & Minuman
            { value: 'minibar', label: '🍺 Minibar', icon: Wine },
            { value: 'room-service', label: '🛎️ Room Service', icon: Bell },
            { value: 'restaurant', label: '🍽️ Restaurant', icon: UtensilsCrossed },
            { value: 'bar', label: '🍸 Bar', icon: GlassWater },
            { value: 'breakfast', label: '🥐 Breakfast', icon: Croissant },
            { value: 'vending-machine', label: '🥤 Vending Machine', icon: Coffee },
            
            // Amenitas Keamanan & Kenyamanan
            { value: 'keycard', label: '🗝️ Keycard Access', icon: KeyRound },
            { value: 'concierge', label: '🎩 Concierge', icon: User },
            { value: 'luggage-storage', label: '🧳 Luggage Storage', icon: Luggage },
            { value: 'laundry-service', label: '👔 Laundry Service', icon: Shirt },
            { value: 'shuttle', label: '🚐 Shuttle Service', icon: Bus },
            { value: 'car-rental', label: '🚗 Car Rental', icon: Car },
            { value: 'bicycle-rental', label: '🚲 Bicycle Rental', icon: Bike },
            
            // Amenitas Hiburan
            { value: 'library', label: '📚 Library', icon: BookOpen },
            { value: 'game-room', label: '🎯 Game Room', icon: Target },
            { value: 'kids-club', label: '🧸 Kids Club', icon: Baby },
            { value: 'playground', label: '🎠 Playground', icon: Trees },
            
            // Amenitas Akses & Mobilitas  
            { value: 'elevator', label: '🛗 Elevator', icon: ArrowUp },
            { value: 'wheelchair-access', label: '♿ Wheelchair Access', icon: Accessibility },
            { value: 'ramp', label: '♿ Ramp Access', icon: TrendingUp },
            
            // Amenitas Outdoor
            { value: 'balcony', label: '🏠 Balcony', icon: Home },
            { value: 'terrace', label: '🏡 Terrace', icon: Building },
            { value: 'patio', label: '🪴 Patio', icon: Flower },
            { value: 'mountain-view', label: '🏔️ Mountain View', icon: Mountain },
            { value: 'sea-view', label: '🌊 Sea View', icon: Waves },
            { value: 'city-view', label: '🌆 City View', icon: Building2 },
            
            // Amenitas Khusus
            { value: 'honeymoon-suite', label: '💒 Honeymoon Suite', icon: Heart },
            { value: 'family-room', label: '👨‍👩‍👧‍👦 Family Room', icon: Users },
            { value: 'smoking-area', label: '🚬 Smoking Area', icon: Cigarette },

          
    ];
}

/**
 * Type untuk amenity dengan icon yang sudah di-transform
 */
export interface AmenityWithIcon {
    id: number;
    name: string;
    icon: string; // Raw string dari database
    iconComponent: LucideIcon; // Transformed component
    category: string;
    description?: string;
    is_active?: boolean;
    sort_order?: number;
}

/**
 * Transform amenity dari backend untuk include icon component
 * @param amenity - Raw amenity dari backend
 * @returns Amenity dengan icon component
 */
export function transformAmenityIcon(amenity: any): AmenityWithIcon {
    return {
        ...amenity,
        iconComponent: getIconByName(amenity.icon),
    };
}

/**
 * Transform array of amenities untuk include icon components
 * @param amenities - Array of raw amenities dari backend
 * @returns Array of amenities dengan icon components
 */
export function transformAmenitiesIcons(amenities: any[]): AmenityWithIcon[] {
    return amenities.map(transformAmenityIcon);
} 