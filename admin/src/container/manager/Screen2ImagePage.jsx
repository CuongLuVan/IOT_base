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
        src={`/image/screen2/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen2Page1 = buildScreenPage('screen2_1', 'screen2_1.jpg');
export const Screen2Page2 = buildScreenPage('screen2_2', 'screen2_2.jpg');
export const Screen2Page3 = buildScreenPage('screen2_3', 'screen2_3.jpg');
export const Screen2Page4 = buildScreenPage('screen2_4', 'screen2_4.jpg');
export const Screen2Page5 = buildScreenPage('screen2_5', 'screen2_5.jpg');
export const Screen2Page6 = buildScreenPage('screen2_6', 'screen2_6.jpg');
export const Screen2Page7 = buildScreenPage('screen2_7', 'screen2_7.jpg');
