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
        src={`/image/screen9/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen9Page1 = buildScreenPage('screen9_1', 'screen9_1.jpg');
export const Screen9Page2 = buildScreenPage('screen9_2', 'screen9_2.jpg');
export const Screen9Page3 = buildScreenPage('screen9_3', 'screen9_3.jpg');
export const Screen9Page4 = buildScreenPage('screen9_4', 'screen9_4.jpg');
export const Screen9Page5 = buildScreenPage('screen9_5', 'screen9_5.jpg');
export const Screen9Page6 = buildScreenPage('screen9_6', 'screen9_6.jpg');
export const Screen9Page7 = buildScreenPage('screen9_7', 'screen9_7.jpg');
