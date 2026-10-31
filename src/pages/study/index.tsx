import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/study/all",
      permanent: false,
    },
  };
};

export default function StudyIndexPage() {
  return null;
}
