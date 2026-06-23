import { EmptyShelf } from 'checkpoint-frontend';

const wrap = {
  padding: '3rem var(--gutter, 4rem)',
  background: 'var(--bg)',
  minHeight: '260px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '3rem',
};

export const Unplayed = () => (
  <div style={wrap}>
    <EmptyShelf line="Nothing played yet — your next great game is one search away." />
  </div>
);

export const Wishlist = () => (
  <div style={wrap}>
    <EmptyShelf line="Your wishlist is empty. Add games you're watching." />
  </div>
);

export const Favourites = () => (
  <div style={wrap}>
    <EmptyShelf line="No favourites yet. Mark the ones that stayed with you." />
  </div>
);
