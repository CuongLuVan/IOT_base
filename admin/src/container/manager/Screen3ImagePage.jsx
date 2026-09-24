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
        src={`/image/screen3/${imageFile}`}
        style={styles.image}
      />
    </div>
  );
  ScreenPage.displayName = `${resourceName}Page`;
  return ScreenPage;
};

export const Screen3Page1 = buildScreenPage('screen3_1', 'screen3_1.jpg');
export const Screen3Page2 = buildScreenPage('screen3_2', 'screen3_2.jpg');
export const Screen3Page3 = buildScreenPage('screen3_3', 'screen3_3.jpg');
export const Screen3Page4 = buildScreenPage('screen3_4', 'screen3_4.jpg');
export const Screen3Page5 = buildScreenPage('screen3_5', 'screen3_5.jpg');
export const Screen3Page6 = buildScreenPage('screen3_6', 'screen3_6.jpg');
export const Screen3Page7 = buildScreenPage('screen3_7', 'screen3_7.jpg');
export const Screen3Page8 = buildScreenPage('screen3_8', 'screen3_8.jpg');
