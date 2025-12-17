import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Loading from './ui/Loading';

export default function GlobalPageLoader({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const start = () => setLoading(true);
        const finish = () => setLoading(false);

        const removeStart = router.on('start', start);
        const removeFinish = router.on('finish', finish);

        return () => {
            removeStart();
            removeFinish();
        };
    }, []);

    return (
        <>
            {loading && <Loading />}
            {children}
        </>
    );
}
