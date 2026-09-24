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
        src={`/image/screen11/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen11Page1 = buildScreenPage('screen11_1', 'screen11_1.jpg');
export const Screen11Page2 = buildScreenPage('screen11_2', 'screen11_2.jpg');
export const Screen11Page3 = buildScreenPage('screen11_3', 'screen11_3.jpg');
export const Screen11Page4 = buildScreenPage('screen11_4', 'screen11_4.jpg');
export const Screen11Page5 = buildScreenPage('screen11_5', 'screen11_5.jpg');
export const Screen11Page6 = buildScreenPage('screen11_6', 'screen11_6.jpg');
export const Screen11Page7 = buildScreenPage('screen11_7', 'screen11_7.jpg');
