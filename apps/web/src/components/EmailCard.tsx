type EmailCardProps = {
  email: {
    from: string;
    subject: string;
    category: string;
    action: string;
  };
};

export default function EmailCard({ email }: EmailCardProps) {
  return (
    <div className="border p-3 rounded shadow hover:shadow-md transition">
      <p>
        <strong>From:</strong> {email.from}
      </p>
      <p>
        <strong>Subject:</strong> {email.subject}
      </p>
      <p>
        <strong>Category:</strong> {email.category}
      </p>
      <p>
        <strong>Suggested Action:</strong> {email.action}
      </p>
      <div className="mt-2 flex gap-2">
        <button className="px-2 py-1 bg-green-500 text-white rounded">
          Keep
        </button>
        <button className="px-2 py-1 bg-yellow-500 text-white rounded">
          Archive
        </button>
        <button className="px-2 py-1 bg-red-500 text-white rounded">
          Delete
        </button>
      </div>
    </div>
  );
}
