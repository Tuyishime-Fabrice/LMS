export const PartnersSection = () => {
    const partners = [
        { name: "NISR Rwanda", logo: "/images/logos/logo-rwanda-nisr-transparent_0.png" },
        { name: "Partner 1", logo: "/images/logos/partner1.jpg" },
        { name: "Partner 2", logo: "/images/logos/partner2.jpg" },
        { name: "Partner 3", logo: "/images/logos/partner3.png" },
        // Add more if needed. Doubling for loop effect handled in map
    ];

    return (
        <section className="py-16 bg-white border-b border-gray-50">
            <div className="container mx-auto px-6">
                <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-10">
                    Trusted by leading institutions
                </p>

                <div className="relative overflow-hidden group">
                    <div className="flex gap-12 animate-scroll-left hover:pause-animation items-center">
                        {[...partners, ...partners, ...partners].map((partner, index) => (
                            <div
                                key={index}
                                className="flex-shrink-0 grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 hover:scale-110 cursor-pointer"
                            >
                                <img
                                    src={partner.logo}
                                    alt={partner.name}
                                    className="h-12 w-auto object-contain max-w-[150px]"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Gradient masks for smooth fade */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />
                </div>
            </div>
        </section>
    );
};
