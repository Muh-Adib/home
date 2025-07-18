import { useState, useEffect } from 'react';

export interface GuestDetail {
    id?: string;
    name: string;
    relationship: string;
    gender: 'male' | 'female';
    age_group: 'adult' | 'child';
    id_number?: string;
}

export interface GuestDetailsState {
    guests: GuestDetail[];
    primaryGuest: {
        name: string;
        email: string;
        phone: string;
        whatsapp?: string;
        id_number?: string;
        country: string;
        gender: 'male' | 'female' | 'prefer_not_to_say';
    };
    guestCount: {
        male: number;
        female: number;
        children: number;
        total: number;
    };
}

export interface UseGuestDetailsProps {
    initialGuestCount?: number;
    initialMaleCount?: number;
    initialFemaleCount?: number;
    initialChildrenCount?: number;
    initialPrimaryGuest?: Partial<GuestDetailsState['primaryGuest']>;
    initialGuests?: GuestDetail[];
}

export function useGuestDetails({
    initialGuestCount = 2,
    initialMaleCount = 1,
    initialFemaleCount = 1,
    initialChildrenCount = 0,
    initialPrimaryGuest = {},
    initialGuests = []
}: UseGuestDetailsProps = {}) {
    
    const [state, setState] = useState<GuestDetailsState>({
        guests: initialGuests,
        primaryGuest: {
            name: '',
            email: '',
            phone: '',
            whatsapp: '',
            id_number: '',
            country: 'Indonesia',
            gender: 'prefer_not_to_say',
            ...initialPrimaryGuest
        },
        guestCount: {
            male: initialMaleCount,
            female: initialFemaleCount,
            children: initialChildrenCount,
            total: initialGuestCount
        }
    });

    // Calculate actual guest count from breakdown
    const actualGuestCount = state.guestCount.male + state.guestCount.female + state.guestCount.children;
    const isGuestCountValid = actualGuestCount === state.guestCount.total;

    // Auto-sync WhatsApp with phone if empty
    useEffect(() => {
        if (state.primaryGuest.phone && !state.primaryGuest.whatsapp) {
            setState(prev => ({
                ...prev,
                primaryGuest: {
                    ...prev.primaryGuest,
                    whatsapp: prev.primaryGuest.phone
                }
            }));
        }
    }, [state.primaryGuest.phone]);

    // Generate guest details based on count breakdown
    useEffect(() => {
        const newGuests: GuestDetail[] = [];
        let guestIndex = 1;

        // Add male adults
        for (let i = 0; i < state.guestCount.male; i++) {
            newGuests.push({
                id: `male-${i}`,
                name: i === 0 ? state.primaryGuest.name : `Guest ${guestIndex}`,
                relationship: i === 0 ? 'self' : 'family_member',
                gender: 'male',
                age_group: 'adult',
                id_number: i === 0 ? state.primaryGuest.id_number : ''
            });
            if (i > 0) guestIndex++;
        }

        // Add female adults
        for (let i = 0; i < state.guestCount.female; i++) {
            const isFirstFemale = state.guestCount.male === 0 && i === 0;
            newGuests.push({
                id: `female-${i}`,
                name: isFirstFemale ? state.primaryGuest.name : `Guest ${guestIndex}`,
                relationship: isFirstFemale ? 'self' : 'family_member',
                gender: 'female',
                age_group: 'adult',
                id_number: isFirstFemale ? state.primaryGuest.id_number : ''
            });
            if (!isFirstFemale) guestIndex++;
        }

        // Add children
        for (let i = 0; i < state.guestCount.children; i++) {
            newGuests.push({
                id: `child-${i}`,
                name: `Child ${i + 1}`,
                relationship: 'child',
                gender: i % 2 === 0 ? 'male' : 'female', // Alternate gender for children
                age_group: 'child'
            });
        }

        setState(prev => ({
            ...prev,
            guests: newGuests
        }));
    }, [state.guestCount, state.primaryGuest.name, state.primaryGuest.id_number]);

    const actions = {
        // Update primary guest info
        updatePrimaryGuest: (updates: Partial<GuestDetailsState['primaryGuest']>) => {
            setState(prev => ({
                ...prev,
                primaryGuest: {
                    ...prev.primaryGuest,
                    ...updates
                }
            }));
        },

        // Update guest count breakdown
        updateGuestCount: (field: keyof GuestDetailsState['guestCount'], value: number) => {
            setState(prev => ({
                ...prev,
                guestCount: {
                    ...prev.guestCount,
                    [field]: value
                }
            }));
        },

        // Update individual guest
        updateGuest: (guestId: string, updates: Partial<GuestDetail>) => {
            setState(prev => ({
                ...prev,
                guests: prev.guests.map(guest => 
                    guest.id === guestId ? { ...guest, ...updates } : guest
                )
            }));
        },

        // Add guest manually
        addGuest: (guest: Omit<GuestDetail, 'id'>) => {
            const newGuest = {
                ...guest,
                id: `manual-${Date.now()}`
            };
            setState(prev => ({
                ...prev,
                guests: [...prev.guests, newGuest]
            }));
        },

        // Remove guest
        removeGuest: (guestId: string) => {
            setState(prev => ({
                ...prev,
                guests: prev.guests.filter(guest => guest.id !== guestId)
            }));
        },

        // Reset to initial state
        reset: () => {
            setState({
                guests: initialGuests,
                primaryGuest: {
                    name: '',
                    email: '',
                    phone: '',
                    whatsapp: '',
                    id_number: '',
                    country: 'Indonesia',
                    gender: 'prefer_not_to_say',
                    ...initialPrimaryGuest
                },
                guestCount: {
                    male: initialMaleCount,
                    female: initialFemaleCount,
                    children: initialChildrenCount,
                    total: initialGuestCount
                }
            });
        },

        // Set from session data
        setFromSessionData: (sessionData: any) => {
            setState(prev => ({
                ...prev,
                primaryGuest: {
                    ...prev.primaryGuest,
                    name: sessionData.guest_name || '',
                    email: sessionData.guest_email || '',
                    phone: sessionData.guest_phone || '',
                    whatsapp: sessionData.guest_whatsapp || '',
                },
                guestCount: {
                    ...prev.guestCount,
                    male: sessionData.male_count || 1,
                    female: sessionData.female_count || 1,
                    children: sessionData.children_count || 0,
                }
            }));
        }
    };

    const computed = {
        isGuestCountValid,
        actualGuestCount,
        hasValidPrimaryGuest: !!(state.primaryGuest.name && state.primaryGuest.email && state.primaryGuest.phone),
        canSubmit: isGuestCountValid && !!(state.primaryGuest.name && state.primaryGuest.email && state.primaryGuest.phone),
        
        // Get form data for submission
        getFormData: () => ({
            // Primary guest info
            guest_name: state.primaryGuest.name,
            guest_email: state.primaryGuest.email,
            guest_phone: state.primaryGuest.phone,
            guest_whatsapp: state.primaryGuest.whatsapp || state.primaryGuest.phone,
            guest_country: state.primaryGuest.country,
            guest_gender: state.primaryGuest.gender,
            guest_id_number: state.primaryGuest.id_number,
            
            // Guest breakdown
            male_count: state.guestCount.male,
            female_count: state.guestCount.female,
            children_count: state.guestCount.children,
            guest_count: state.guestCount.total,
            
            // Relationship type (simplified)
            relationship_type: state.guests.length > 1 ? 'family' : 'individual',
            
            // Guest details array
            guest_details: state.guests
        }),

        // Get validation errors
        getValidationErrors: () => {
            const errors: Record<string, string> = {};
            
            if (!state.primaryGuest.name.trim()) {
                errors.guest_name = 'Name is required';
            }
            
            if (!state.primaryGuest.email.trim()) {
                errors.guest_email = 'Email is required';
            } else if (!/\S+@\S+\.\S+/.test(state.primaryGuest.email)) {
                errors.guest_email = 'Invalid email format';
            }
            
            if (!state.primaryGuest.phone.trim()) {
                errors.guest_phone = 'Phone is required';
            }
            
            if (!isGuestCountValid) {
                errors.guest_count = `Guest breakdown must total ${state.guestCount.total} guests (currently ${actualGuestCount})`;
            }
            
            return errors;
        }
    };

    return {
        state,
        actions,
        computed
    };
}