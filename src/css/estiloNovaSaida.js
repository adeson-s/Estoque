const mobile = '@media (max-width: 768px)';

export const s = {
  root: {
    background: '#FFF',
    padding: '0 1rem 2rem',
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },

  topBar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 12,
    padding: '12px 16px',

    [mobile]: {
      flexDirection: 'column',
      padding: '10px',
    },
  },

  topField: {
    flex: 1,
    minWidth: 130,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  label: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    letterSpacing: '0.03em',
  },

  input: {
    padding: '7px 10px',
    fontSize: 13,
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 8,
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
    width: '100%',
    boxSizing: 'border-box',
  },

  body: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: 10,
    alignItems: 'start',

    [mobile]: {
      gridTemplateColumns: '1fr',
    },
  },

  leftCol: {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',

    [mobile]: {
      marginBottom: '65vh',
    },
  },

  rightCol: {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 300,
    overflow: 'visible',

    [mobile]: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      borderRadius: '12px 12px 0 0',
      maxHeight: '60vh',
    },
  },

  colHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
    gap: 8,
  },

  colTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  countPill: {
    fontSize: 11,
    color: 'var(--color-text-secondary)',
    background: 'var(--color-background-secondary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 20,
    padding: '1px 7px',
  },

  btnQR: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 500,
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 8,
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
  },

  searchWrap: {
    position: 'relative',
    padding: '10px 14px',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
    display: 'flex',
    alignItems: 'center',
  },

  searchIcon: {
    position: 'absolute',
    left: 24,
    color: 'var(--color-text-secondary)',
  },

  searchInput: {
    width: '100%',
    padding: '6px 28px',
    fontSize: 13,
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 8,
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-primary)',
    boxSizing: 'border-box',
  },

  searchClear: {
    position: 'absolute',
    right: 22,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    color: 'var(--color-text-secondary)',
  },

  prodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
    gap: 8,
    padding: 12,

    [mobile]: {
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 6,
      padding: 10,
    },
  },

  prodCard: {
    border: '0.5px solid',
    borderRadius: 10,
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    textAlign: 'center',
    transition: 'border-color 0.1s',
  },

  prodNome: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    lineHeight: 1.3,
    wordBreak: 'break-word',

    [mobile]: {
      fontSize: 10,
    },
  },

  prodHint: {
    fontSize: 10,
    color: 'var(--color-text-secondary)',
  },

  prodQtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },

  qtyBtn: {
    width: 22,
    height: 22,
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 5,
    background: 'var(--color-background-primary)',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    flexShrink: 0,
  },

  qtyVal: {
    fontSize: 13,
    fontWeight: 500,
    color: '#185FA5',
    minWidth: 18,
    textAlign: 'center',
  },

  cartBadge: {
    background: '#185FA5',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 20,
    padding: '1px 7px',
    minWidth: 20,
    textAlign: 'center',
  },

  emptyCart: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 1rem',
    textAlign: 'center',
  },

  cartList: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
  },

  cartItem: {
    borderBottom: '0.5px solid var(--color-border-tertiary)',
    display: 'flex',
    flexDirection: 'column',
  },

  cartItemTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '10px 14px 4px',
    gap: 8,
  },

  cartItemNome: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    marginBottom: 4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  cartItemQtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },

  cartItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },

  statusBadge: {
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 9px',
    borderRadius: 20,
    cursor: 'pointer',
    border: '0.5px solid',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    background: 'transparent',
  },

  statusDrop: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 4px)',
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-secondary)',
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 200,
    minWidth: 150,
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },

  statusOpt: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },

  delBtn: {
    width: 22,
    height: 22,
    borderRadius: 5,
    border: 'none',
    background: '#FCEBEB',
    color: '#A32D2D',
    cursor: 'pointer',
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  obsTextarea: {
    width: '100%',
    padding: '5px 8px',
    fontSize: 12,
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 7,
    background: 'var(--color-background-secondary)',
    color: 'var(--color-text-primary)',
    resize: 'none',
    fontFamily: 'var(--font-sans)',
    lineHeight: 1.4,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },

  cartFooter: {
    padding: '10px 14px',
    borderTop: '0.5px solid var(--color-border-tertiary)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  cartMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    flexWrap: 'wrap',
    gap: 4,
  },

  btnConfirmar: {
    width: '100%',
    padding: '10px',
    background: '#185FA5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,

    [mobile]: {
      padding: '14px',
      fontSize: 16,
    },
  },

  feedback: {
    margin: '0 14px 12px',
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: 12,
    border: '0.5px solid',
    fontWeight: 500,
  },

  qrBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },

  qrModal: {
    background: 'var(--color-background-primary)',
    borderRadius: 14,
    width: 320,
    maxWidth: '95vw',
    overflow: 'hidden',
  },

  qrHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
  },

  qrTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  },

  qrCloseBtn: {
    width: 26,
    height: 26,
    border: 'none',
    background: 'var(--color-background-secondary)',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  qrVideoWrap: {
    position: 'relative',
    background: '#000',
    aspectRatio: '1',
  },

  qrVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },

  qrFinder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 170,
    height: 170,
    border: '2px solid #378ADD',
    borderRadius: 10,
    boxSizing: 'border-box',
  },

  qrErro: {
    padding: 16,
    fontSize: 13,
    color: '#A32D2D',
    background: '#FCEBEB',
    textAlign: 'center',
  },

  qrDica: {
    padding: '10px 14px',
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    margin: 0,
  },
};