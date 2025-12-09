#pragma once
#include <vector>

struct PTE {
    bool present = false;
    int frame = -1;
};

class Process {
public:
    int pid;
    std::vector<PTE> pageTable;

    Process() : pid(-1), pageTable(32) {}
    
    Process(int pid, int pageCount = 32)
        : pid(pid), pageTable(pageCount) {}
};
