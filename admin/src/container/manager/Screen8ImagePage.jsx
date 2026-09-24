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
        src={`/image/screen8/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen8Page1 = buildScreenPage('screen8_1', 'screen8_1.jpg');
export const Screen8Page2 = buildScreenPage('screen8_2', 'screen8_2.jpg');
export const Screen8Page3 = buildScreenPage('screen8_3', 'screen8_3.jpg');
export const Screen8Page4 = buildScreenPage('screen8_4', 'screen8_4.jpg');
export const Screen8Page5 = buildScreenPage('screen8_5', 'screen8_5.jpg');
export const Screen8Page6 = buildScreenPage('screen8_6', 'screen8_6.jpg');
export const Screen8Page7 = buildScreenPage('screen8_7', 'screen8_7.jpg');
