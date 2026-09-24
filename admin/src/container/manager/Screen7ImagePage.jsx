import React from 'react';

const styles = {
  root: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    minHeight: 'calc(100vh - 64px)',
  },
  image: {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
    margin: '0 auto',
    backgroundColor: '#fff',
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
  },
};

const buildScreenPage = (resourceName, imageFile) => {
  const ScreenPage = () => (
    <div style={styles.root}>
      <img
        alt={resourceName}
        src={`/image/screen7/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen7Page1 = buildScreenPage('screen7_1', 'screen7_1.jpg');
export const Screen7Page2 = buildScreenPage('screen7_2', 'screen7_2.jpg');
export const Screen7Page3 = buildScreenPage('screen7_3', 'screen7_3.jpg');
export const Screen7Page4 = buildScreenPage('screen7_4', 'screen7_4.jpg');
export const Screen7Page5 = buildScreenPage('screen7_5', 'screen7_5.jpg');
export const Screen7Page6 = buildScreenPage('screen7_6', 'screen7_6.jpg');
export const Screen7Page7 = buildScreenPage('screen7_7', 'screen7_7.jpg');
