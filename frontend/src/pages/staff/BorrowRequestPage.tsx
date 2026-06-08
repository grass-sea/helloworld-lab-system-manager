import { useState } from "react";

import SearchBar from "../../components/common/SearchBar";

import BorrowRequestTable from "../../components/tables/BorrowRequestTable";

import { requestMock } from "../../mock/request";

import type { BorrowRequestRow } from "../../types/request";

export default function BorrowRequestPage() {
  const [requests, setRequests] =
    useState<BorrowRequestRow[]>(
      requestMock
    );

  const [search, setSearch] =
    useState("");

  const filteredRequests =
    requests.filter((item) =>
      item.studentName
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  const handleApprove = (
    request: BorrowRequestRow
  ) => {
    setRequests(
      requests.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: "APPROVED",
            }
          : item
      )
    );
  };

  const handleReject = (
    request: BorrowRequestRow
  ) => {
    setRequests(
      requests.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: "REJECTED",
            }
          : item
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">
          Borrow Requests
        </h1>

        <p className="text-gray-500">
          Review borrowing requests
        </p>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search student..."
      />

      <BorrowRequestTable
        requests={filteredRequests}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
