import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy } from 'firebase/firestore';

export function useCollection(colRef, orderField = null, direction = 'asc') {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!colRef) return;
    const q = orderField ? query(colRef, orderBy(orderField, direction)) : colRef;
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });
    return unsub;
  }, [colRef?.path, orderField, direction]);
  return { items, loading, error };
}
