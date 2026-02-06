const MOCK_DATA = [
    {
        id: 'SC-001',
        warehouseId: 'BDG-A-04',
        name: 'Nebula Fragment',
        image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=500',
        status: 'en_bodega', // 'en_bodega' | 'fuera'
        history: [
            {
                type: 'entrada', // 'entrada' (Recibido) | 'salida' (Entregado)
                person: 'Roberto S.',
                date: '2026-01-15T10:30:00',
                notes: 'Ingreso inicial'
            }
        ]
    },
    {
        id: 'SC-002',
        warehouseId: 'BDG-B-12',
        name: 'Void Walker',
        image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=500',
        status: 'fuera',
        history: [
            {
                type: 'entrada',
                person: 'Ana D.',
                date: '2026-01-10T09:00:00',
                notes: 'Ingreso inicial'
            },
            {
                type: 'salida',
                person: 'Juan P.',
                date: '2026-02-01T14:15:00',
                notes: 'Préstamo para exhibición lobby'
            }
        ]
    },
    {
        id: 'SC-003',
        warehouseId: 'BDG-A-01',
        name: 'Solar Flare',
        image: 'https://images.unsplash.com/photo-1572932976239-0d5870b9255a?auto=format&fit=crop&q=80&w=500',
        status: 'en_bodega',
        history: [
            {
                type: 'entrada',
                person: 'Roberto S.',
                date: '2026-02-05T11:20:00',
                notes: 'Regreso de mantenimiento'
            }
        ]
    }
];

const APP_STATE = {
    sculptures: [...MOCK_DATA],
    currentUser: 'Admin'
};
